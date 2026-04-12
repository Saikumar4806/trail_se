const db = require('../config/db');

const ComboModel = {
  createCombo: async ({ user_id, name }, connection = db) => {
    const [result] = await connection.query(
      'INSERT INTO combos (user_id, name) VALUES (?, ?)',
      [user_id, name]
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
  }
};

module.exports = ComboModel;
