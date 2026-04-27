const db = require('../config/db');

const ComboModel = {
  createCombo: async ({ user_id, name, total_amount = 0 }, connection = db) => {
    const [result] = await connection.query(
      'INSERT INTO combos (user_id, name, total_amount) VALUES (?, ?, ?)',
      [user_id, name, total_amount]
    );

    return result;
  },

  insertComboItems: async ({ combo_id, items }, connection = db) => {
    const values = items.map((item) => [combo_id, item.item_id, item.price, item.quantity]);

    const [result] = await connection.query(
      'INSERT INTO combo_items (combo_id, item_id, price, quantity) VALUES ?',
      [values]
    );

    return result;
  },

  createPayment: async (
    {
      user_id,
      subscription_id = null,
      amount,
      payment_method,
      payment_status = 'completed',
      upi_id = null,
      card_last4 = null,
      transaction_id = null
    },
    connection = db
  ) => {
    const [result] = await connection.query(
      `INSERT INTO payments
        (user_id, subscription_id, amount, payment_method, payment_status, upi_id, card_last4, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        subscription_id,
        amount,
        payment_method,
        payment_status,
        upi_id,
        card_last4,
        transaction_id
      ]
    );

    return result;
  }
};

module.exports = ComboModel;
