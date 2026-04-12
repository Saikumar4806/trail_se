const db = require('../config/db');

const ItemModel = {
  create: async (itemData) => {
    const { name, price, unit, category, quantity, quantity_unit, image_url } = itemData;
    const [result] = await db.query(
      'INSERT INTO items (name, price, unit, category, quantity, quantity_unit, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, price, unit, category, quantity, quantity_unit, image_url]
    );
    return result;
  },
  
  findAll: async () => {
    const [rows] = await db.query('SELECT * FROM items ORDER BY created_at DESC');
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    return rows[0];
  },

  update: async (id, itemData) => {
    const { name, price, unit, category, quantity, quantity_unit, image_url } = itemData;
    const [result] = await db.query(
      'UPDATE items SET name = ?, price = ?, unit = ?, category = ?, quantity = ?, quantity_unit = ?, image_url = ? WHERE id = ?',
      [name, price, unit, category, quantity, quantity_unit, image_url, id]
    );
    return result;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM items WHERE id = ?', [id]);
    return result;
  }
};

module.exports = ItemModel;
