const db = require("../config/db");

const toSqlDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date provided");
  }
  return d.toISOString().slice(0, 10);
};

const generateDailyOrders = async (targetDate = new Date()) => {
  const sqlDate = toSqlDate(targetDate);

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
      AND sp.pause_date = ?
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

module.exports = {
  getOrdersByCustomerId,
  getOrdersByDate,
  generateDailyOrders,
};
