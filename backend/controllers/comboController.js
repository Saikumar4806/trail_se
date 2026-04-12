const ComboModel = require('../models/comboModel');
const db = require('../config/db');

const comboController = {
  completeCheckout: async (req, res) => {
    let connection;

    try {
      const {
        user_id,
        plan_type,
        delivery_slot,
        start_date,
        address,
        combo
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }

      const validPlanTypes = ['weekly', '1_month', '3_months', 'yearly'];
      if (!validPlanTypes.includes(String(plan_type || '').trim())) {
        return res.status(400).json({ success: false, message: 'Invalid plan_type' });
      }

      const validSlots = ['morning', 'evening'];
      if (!validSlots.includes(String(delivery_slot || '').trim())) {
        return res.status(400).json({ success: false, message: 'Invalid delivery_slot' });
      }

      if (!address || typeof address !== 'object') {
        return res.status(400).json({ success: false, message: 'Address details are required' });
      }

      if (!combo || typeof combo !== 'object') {
        return res.status(400).json({ success: false, message: 'Combo details are required' });
      }

      if (!Array.isArray(combo.items) || combo.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Selected items are required' });
      }

      const normalizedItems = combo.items.map((item) => ({
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
        return res.status(400).json({ success: false, message: 'Invalid item payload' });
      }

      if (!address.street || !address.city || !address.state || !address.pincode || !address.address_type) {
        return res.status(400).json({
          success: false,
          message: 'street, city, state, pincode and address_type are required in address'
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      if (address.is_default) {
        await connection.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [Number(user_id)]);
      }

      const [addressInsert] = await connection.query(
        `INSERT INTO addresses
          (user_id, street, area, city, state, pincode, landmark, latitude, longitude, address_type, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(user_id),
          String(address.street).trim(),
          address.area ? String(address.area).trim() : null,
          String(address.city).trim(),
          String(address.state).trim(),
          String(address.pincode).trim(),
          address.landmark ? String(address.landmark).trim() : null,
          address.latitude ?? null,
          address.longitude ?? null,
          String(address.address_type).toLowerCase(),
          address.is_default ? 1 : 0
        ]
      );

      const [comboInsert] = await connection.query(
        'INSERT INTO combos (user_id, name) VALUES (?, ?)',
        [Number(user_id), String(combo.combo_name || 'My Combo').trim()]
      );

      const comboId = comboInsert.insertId;
      const comboItemValues = normalizedItems.map((item) => [comboId, item.item_id, item.price, item.quantity]);

      await connection.query(
        'INSERT INTO combo_items (combo_id, item_id, price, quantity) VALUES ?',
        [comboItemValues]
      );

      const [subscriptionInsert] = await connection.query(
        `INSERT INTO subscriptions
          (user_id, address_id, combo_id, plan_type, delivery_slot, start_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Number(user_id),
          addressInsert.insertId,
          comboId,
          plan_type,
          delivery_slot,
          start_date || new Date().toISOString().slice(0, 10)
        ]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Checkout completed successfully',
        data: {
          address_id: addressInsert.insertId,
          combo_id: comboId,
          subscription_id: subscriptionInsert.insertId,
          inserted_combo_items: comboItemValues.length
        }
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Error completing checkout:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error completing checkout'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

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
