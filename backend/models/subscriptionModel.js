const db = require("../config/db");

const toSqlDate = (date) => date.toISOString().slice(0, 10);

const getSubscriptionsByUserId = async (userId) => {
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

    const [subscriptionRows] = await connection.query(
      "SELECT subscription_id FROM subscriptions WHERE subscription_id = ? LIMIT 1",
      [subscriptionId]
    );

    if (subscriptionRows.length === 0) {
      await connection.rollback();
      return { success: false };
    }

    const [existingPauseRows] = await connection.query(
      `SELECT pause_id
       FROM subscription_pauses
       WHERE subscription_id = ? AND pause_date = ?
       LIMIT 1`,
      [subscriptionId, pauseDate]
    );

    if (existingPauseRows.length > 0) {
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

module.exports = {
  getSubscriptionsByUserId,
  pauseSubscriptionForTodayById,
};
