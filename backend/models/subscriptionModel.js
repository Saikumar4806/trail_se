const db = require("../config/db");

const toSqlDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date provided");
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resumeStalePausedSubscriptions = async (connectionOrDb = db) => {
  const today = toSqlDate(new Date());

  await connectionOrDb.query(
    `UPDATE subscriptions s
     SET s.status = 'active'
     WHERE s.status = 'paused'
       AND NOT EXISTS (
         SELECT 1
         FROM subscription_pauses sp
         WHERE sp.subscription_id = s.subscription_id
           AND sp.pause_date = ?
       )`,
    [today]
  );
};

const getSubscriptionsByUserId = async (userId) => {
  await resumeStalePausedSubscriptions();

  const today = toSqlDate(new Date());

  const [rows] = await db.query(
    `SELECT
      subscriptions.subscription_id,
      subscriptions.user_id,
      subscriptions.address_id,
      subscriptions.combo_id,
      combos.total_amount AS total_price,
      subscriptions.plan_type,
      subscriptions.delivery_slot,
      subscriptions.start_date,
      subscriptions.end_date,
      subscriptions.status,
      subscriptions.pause_count,
      EXISTS (
        SELECT 1
        FROM subscription_pauses sp
        WHERE sp.subscription_id = subscriptions.subscription_id
          AND sp.pause_date = ?
      ) AS is_paused_today,
      subscriptions.created_at,
      subscriptions.updated_at
    FROM subscriptions
    LEFT JOIN combos ON combos.combo_id = subscriptions.combo_id
    WHERE subscriptions.user_id = ?
    ORDER BY subscriptions.created_at DESC`,
    [today, userId]
  );

  return rows;
};

const pauseSubscriptionForTodayById = async (subscriptionId, reason = null) => {
  const connection = await db.getConnection();

  const now = new Date();
  const pauseDate = toSqlDate(now);
  const resumeDateObj = new Date(now);
  resumeDateObj.setDate(resumeDateObj.getDate() + 1);
  const resumeDate = toSqlDate(resumeDateObj);

  try {
    await connection.beginTransaction();

    await resumeStalePausedSubscriptions(connection);

    const [subscriptionRows] = await connection.query(
      "SELECT subscription_id, status FROM subscriptions WHERE subscription_id = ? LIMIT 1",
      [subscriptionId]
    );

    if (subscriptionRows.length === 0) {
      await connection.rollback();
      return { success: false, code: "not_found" };
    }

    const subscription = subscriptionRows[0];

    if ((subscription.status || "").toLowerCase() === "cancelled") {
      await connection.rollback();
      return { success: false, code: "cancelled" };
    }

    const [existingPauseRows] = await connection.query(
      `SELECT pause_id
       FROM subscription_pauses
       WHERE subscription_id = ? AND pause_date = ?
       LIMIT 1`,
      [subscriptionId, pauseDate]
    );

    if (existingPauseRows.length > 0) {
      await connection.query(
        `UPDATE subscriptions
         SET status = 'paused'
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      await connection.commit();
      return {
        success: true,
        alreadyPausedToday: true,
        pauseDate,
        resumeDate,
      };
    }

    await connection.query(
      `INSERT INTO subscription_pauses
        (subscription_id, pause_date, resume_date, reason)
       VALUES (?, ?, ?, ?)`,
      [subscriptionId, pauseDate, resumeDate, reason]
    );

    await connection.query(
      `UPDATE subscriptions
       SET status = 'paused',
           pause_count = COALESCE(pause_count, 0) + 1
       WHERE subscription_id = ?`,
      [subscriptionId]
    );

    await connection.commit();

    return {
      success: true,
      alreadyPausedToday: false,
      pauseDate,
      resumeDate,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const unpauseSubscriptionForTodayById = async (subscriptionId) => {
  const connection = await db.getConnection();

  const now = new Date();
  const pauseDate = toSqlDate(now);

  try {
    await connection.beginTransaction();

    await resumeStalePausedSubscriptions(connection);

    const [subscriptionRows] = await connection.query(
      "SELECT subscription_id, status FROM subscriptions WHERE subscription_id = ? LIMIT 1",
      [subscriptionId]
    );

    if (subscriptionRows.length === 0) {
      await connection.rollback();
      return { success: false, code: "not_found" };
    }

    const subscription = subscriptionRows[0];

    if ((subscription.status || "").toLowerCase() === "cancelled") {
      await connection.rollback();
      return { success: false, code: "cancelled" };
    }

    const [existingPauseRows] = await connection.query(
      `SELECT pause_id
       FROM subscription_pauses
       WHERE subscription_id = ? AND pause_date = ?
       LIMIT 1`,
      [subscriptionId, pauseDate]
    );

    if (existingPauseRows.length === 0) {
      await connection.commit();
      return {
        success: true,
        alreadyUnpausedToday: true,
        pauseDate,
      };
    }

    await connection.query(
      `DELETE FROM subscription_pauses WHERE pause_id = ?`,
      [existingPauseRows[0].pause_id]
    );

    await connection.query(
      `UPDATE subscriptions
       SET pause_count = GREATEST(COALESCE(pause_count, 0) - 1, 0),
           status = CASE WHEN status = 'paused' THEN 'active' ELSE status END
       WHERE subscription_id = ?`,
      [subscriptionId]
    );

    await connection.commit();

    return {
      success: true,
      alreadyUnpausedToday: false,
      pauseDate,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getSubscriptionsByUserId,
  pauseSubscriptionForTodayById,
  unpauseSubscriptionForTodayById,
  resumeStalePausedSubscriptions,
};
