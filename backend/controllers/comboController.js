const ComboModel = require('../models/comboModel');
const db = require('../config/db');

const comboController = {
  createComboItems: async (req, res) => {
    try {
      const { user_id, combo_name, combo_id, items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected items are required'
        });
      }

      const normalizedItems = items.map((item) => ({
        item_id: Number(item.item_id),
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));

      const hasInvalidItem = normalizedItems.some((item) => (
        !Number.isInteger(item.item_id) || item.item_id <= 0 ||
        Number.isNaN(item.price) || item.price < 0 ||
        !Number.isInteger(item.quantity) || item.quantity <= 0
      ));

      if (hasInvalidItem) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item payload'
        });
      }

      const connection = await db.getConnection();
      let resolvedComboId = Number(combo_id) || null;

      try {
        await connection.beginTransaction();

        if (!resolvedComboId) {
          if (!user_id) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
              success: false,
              message: 'user_id is required when combo_id is not provided'
            });
          }

          const comboInsert = await ComboModel.createCombo({
            user_id: Number(user_id),
            name: String(combo_name || 'My Combo').trim()
          }, connection);

          resolvedComboId = comboInsert.insertId;
        }

        const insertResult = await ComboModel.insertComboItems({
          combo_id: resolvedComboId,
          items: normalizedItems
        }, connection);

        await connection.commit();
        connection.release();

        return res.status(201).json({
          success: true,
          message: 'Selection saved successfully',
          data: {
            combo_id: resolvedComboId,
            inserted_count: insertResult.affectedRows
          }
        });
      } catch (txError) {
        await connection.rollback();
        connection.release();
        throw txError;
      }

    } catch (error) {
      console.error('Error saving combo items:', error);

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          success: false,
          message: 'Invalid foreign key reference for combo or item'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error saving selection'
      });
    }
  }
};

module.exports = comboController;
