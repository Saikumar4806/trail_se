const db = require("../config/db");

const toSqlDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date provided");
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const generateDailyOrders = async (targetDate = new Date()) => {
  const sqlDate = toSqlDate(targetDate);

  await db.query(
    `UPDATE subscriptions s
     SET s.status = 'active'
     WHERE s.status = 'paused'
       AND NOT EXISTS (
         SELECT 1
         FROM subscription_pauses sp
         WHERE sp.subscription_id = s.subscription_id
           AND sp.pause_date = ?
       )`,
    [sqlDate]
  );

  const [result] = await db.query(
    `INSERT INTO orders
      (
        subscription_id,
        customer_id,
        address_id,
        order_date,
        delivery_date,
        delivery_slot,
        combo_id,
        total_amount,
        status
      )
     SELECT
       s.subscription_id,
       s.user_id AS customer_id,
       s.address_id,
       ? AS order_date,
       ? AS delivery_date,
       s.delivery_slot,
       s.combo_id,
       COALESCE(c.total_amount, 0.00) AS total_amount,
       'out_for_delivery' AS status
     FROM subscriptions s
     INNER JOIN combos c
       ON c.combo_id = s.combo_id
     LEFT JOIN subscription_pauses sp
       ON sp.subscription_id = s.subscription_id
      AND sp.pause_date = DATE_SUB(?, INTERVAL 1 DAY)
     LEFT JOIN orders o
       ON o.subscription_id = s.subscription_id
      AND o.order_date = ?
     WHERE s.status = 'active'
       AND sp.subscription_id IS NULL
       AND o.order_id IS NULL`,
    [sqlDate, sqlDate, sqlDate, sqlDate]
  );

  return {
    date: sqlDate,
    insertedCount: result.affectedRows || 0,
  };
};

const getOrdersByCustomerId = async (customerId) => {
  const [orders] = await db.query(
    `SELECT
      order_id,
      subscription_id,
      customer_id,
      address_id,
      order_date,
      delivery_date,
      delivery_slot,
      combo_id,
      total_amount,
      status
    FROM orders
    WHERE customer_id = ?
    ORDER BY order_date DESC, order_id DESC`,
    [customerId]
  );

  return orders;
};

const getOrdersByDate = async (selectedDate) => {
  const [orders] = await db.query(
    `SELECT
      order_id,
      subscription_id,
      customer_id,
      address_id,
      order_date,
      delivery_date,
      delivery_slot,
      combo_id,
      total_amount,
      status
    FROM orders
    WHERE order_date = ?
    ORDER BY order_id DESC`,
    [selectedDate]
  );

  return orders;
};

const markOrderDelivered = async (orderId) => {
  const [result] = await db.query(
    `UPDATE orders SET status = 'delivered' WHERE order_id = ? AND status = 'out_for_delivery'`,
    [orderId]
  );
  return result.affectedRows > 0;
};

const resetOrderToOutForDelivery = async (orderId) => {
  const [result] = await db.query(
    `UPDATE orders SET status = 'out_for_delivery' WHERE order_id = ? AND status = 'delivered'`,
    [orderId]
  );
  return result.affectedRows > 0;
};

const getLatestOrderBySubscription = async (subscriptionId) => {
  const queryWithPartnerLocation = `SELECT
      o.order_id,
      o.subscription_id,
      o.customer_id,
      o.address_id,
      o.delivery_date,
      o.delivery_slot,
      o.total_amount,
      o.status,
      o.partner_id,
      a.latitude AS customer_lat,
      a.longitude AS customer_lng,
      a.street,
      a.area,
      u.name AS customer_name,
      dp.current_lat AS partner_lat,
      dp.current_lng AS partner_lng
    FROM orders o
    JOIN addresses a ON o.address_id = a.address_id
    JOIN users u ON o.customer_id = u.id
    LEFT JOIN users dp ON o.partner_id = dp.id AND dp.role = 'delivery_partner'
    WHERE o.subscription_id = ?
    ORDER BY o.delivery_date DESC, o.order_id DESC
    LIMIT 1`;

  const queryWithoutPartnerLocation = `SELECT
      o.order_id,
      o.subscription_id,
      o.customer_id,
      o.address_id,
      o.delivery_date,
      o.delivery_slot,
      o.total_amount,
      o.status,
      o.partner_id,
      a.latitude AS customer_lat,
      a.longitude AS customer_lng,
      a.street,
      a.area,
      u.name AS customer_name,
      NULL AS partner_lat,
      NULL AS partner_lng
    FROM orders o
    JOIN addresses a ON o.address_id = a.address_id
    JOIN users u ON o.customer_id = u.id
    WHERE o.subscription_id = ?
    ORDER BY o.delivery_date DESC, o.order_id DESC
    LIMIT 1`;

  try {
    const [orders] = await db.query(queryWithPartnerLocation, [subscriptionId]);
    return orders.length > 0 ? orders[0] : null;
  } catch (error) {
    const missingPartnerLocationColumn =
      error &&
      error.code === "ER_BAD_FIELD_ERROR" &&
      /current_lat|current_lng/.test(String(error.sqlMessage || ""));

    if (!missingPartnerLocationColumn) {
      throw error;
    }

    const [orders] = await db.query(queryWithoutPartnerLocation, [subscriptionId]);
    return orders.length > 0 ? orders[0] : null;
  }
};

const getOrdersByPartnerId = async (partnerId) => {
  const [orders] = await db.query(
    `SELECT
      o.order_id,
      o.subscription_id,
      o.customer_id,
      o.address_id,
      o.order_date,
      o.delivery_date,
      o.delivery_slot,
      o.total_amount,
      o.status,
      u.name AS customer_name,
      CONCAT(a.street, ', ', a.area) AS address
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    JOIN addresses a ON o.address_id = a.address_id
    WHERE o.partner_id = ?
    ORDER BY o.delivery_date DESC, o.order_id DESC`,
    [partnerId]
  );

  return orders;
};

module.exports = {
  getOrdersByCustomerId,
  getOrdersByDate,
  generateDailyOrders,
  markOrderDelivered,
  resetOrderToOutForDelivery,
  getLatestOrderBySubscription,
  getOrdersByPartnerId,
};
