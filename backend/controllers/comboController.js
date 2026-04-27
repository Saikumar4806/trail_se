const ComboModel = require('../models/comboModel');
const db = require('../config/db');

const PLAN_CHARGES = {
  weekly: 200,
  '1_month': 800,
  '3_months': 2200,
  yearly: 8000
};

const DELIVERY_CHARGE = 50;

const toSqlDate = (date) => date.toISOString().slice(0, 10);

const getCalculatedEndDate = (startDateValue, planType) => {
  const startDate = new Date(startDateValue);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid start_date');
  }

  const endDate = new Date(startDate);

  switch (String(planType).trim()) {
    case 'weekly':
      endDate.setUTCDate(endDate.getUTCDate() + 7);
      break;
    case '1_month':
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      break;
    case '3_months':
      endDate.setUTCMonth(endDate.getUTCMonth() + 3);
      break;
    case 'yearly':
      endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
      break;
    default:
      throw new Error('Invalid plan_type');
  }

  return toSqlDate(endDate);
};

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
        combo,
        payment_method,
        payment_details
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id is required' });
      }

      const normalizedPlanType = String(plan_type || '').trim();
      const validPlanTypes = ['weekly', '1_month', '3_months', 'yearly'];
      if (!validPlanTypes.includes(normalizedPlanType)) {
        return res.status(400).json({ success: false, message: 'Invalid plan_type' });
      }

      const normalizedDeliverySlot = String(delivery_slot || '').trim();
      const validSlots = ['morning', 'evening'];
      if (!validSlots.includes(normalizedDeliverySlot)) {
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

      const validPaymentMethods = ['card', 'upi', 'cash'];
      const normalizedPaymentMethod = String(payment_method || '').trim().toLowerCase();
      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return res.status(400).json({ success: false, message: 'Invalid payment_method' });
      }

      const paymentDetails = payment_details && typeof payment_details === 'object' ? payment_details : {};

      let cardLastFour = null;
      let upiId = null;

      if (normalizedPaymentMethod === 'card') {
        cardLastFour = String(paymentDetails.last_four || '').replace(/\D/g, '').slice(-4);
        if (cardLastFour.length !== 4) {
          return res.status(400).json({ success: false, message: 'Valid card last four digits are required' });
        }
      }

      if (normalizedPaymentMethod === 'upi') {
        upiId = String(paymentDetails.upi_id || '').trim();
        if (!upiId || !upiId.includes('@')) {
          return res.status(400).json({ success: false, message: 'Valid upi_id is required for UPI payment' });
        }
      }

      const normalizedItems = combo.items.map((item) => ({
        item_id: Number(item.item_id),
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));

      const comboTotalAmount = normalizedItems
        .reduce((sum, item) => sum + (item.price * item.quantity), 0)
        .toFixed(2);

      const paymentAmount = Number(
        (Number(comboTotalAmount) + (PLAN_CHARGES[normalizedPlanType] || 0) + DELIVERY_CHARGE).toFixed(2)
      );

      const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

      const hasInvalidItem = normalizedItems.some((item) => (
        !Number.isInteger(item.item_id) || item.item_id <= 0 ||
        Number.isNaN(item.price) || item.price < 0 ||
        !Number.isInteger(item.quantity) || item.quantity <= 0
      ));

      if (hasInvalidItem) {
        return res.status(400).json({ success: false, message: 'Invalid item payload' });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      let resolvedAddressId = null;
      const existingAddressId = Number.parseInt(address.address_id, 10);

      if (Number.isInteger(existingAddressId) && existingAddressId > 0) {
        const [addressRows] = await connection.query(
          'SELECT address_id FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1',
          [existingAddressId, Number(user_id)]
        );

        if (addressRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Selected address not found for this user'
          });
        }

        resolvedAddressId = existingAddressId;
      } else {
        if (!address.street || !address.city || !address.state || !address.pincode || !address.address_type) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'street, city, state, pincode and address_type are required in address'
          });
        }

        const parsedLatitude = Number(address.latitude);
        const parsedLongitude = Number(address.longitude);

        if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'latitude and longitude are required in address'
          });
        }

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
            parsedLatitude,
            parsedLongitude,
            String(address.address_type).toLowerCase(),
            address.is_default ? 1 : 0
          ]
        );

        resolvedAddressId = addressInsert.insertId;
      }

      const [comboInsert] = await connection.query(
        'INSERT INTO combos (user_id, name, total_amount) VALUES (?, ?, ?)',
        [Number(user_id), String(combo.combo_name || 'My Combo').trim(), comboTotalAmount]
      );

      const comboId = comboInsert.insertId;
      const comboItemValues = normalizedItems.map((item) => [comboId, item.item_id, item.price, item.quantity]);

      await connection.query(
        'INSERT INTO combo_items (combo_id, item_id, price, quantity) VALUES ?',
        [comboItemValues]
      );

      const resolvedStartDate = start_date || toSqlDate(new Date());
      const calculatedEndDate = getCalculatedEndDate(resolvedStartDate, normalizedPlanType);

      const [subscriptionInsert] = await connection.query(
        `INSERT INTO subscriptions
          (user_id, address_id, combo_id, plan_type, delivery_slot, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(user_id),
          resolvedAddressId,
          comboId,
          normalizedPlanType,
          normalizedDeliverySlot,
          resolvedStartDate,
          calculatedEndDate
        ]
      );

      const paymentInsert = await ComboModel.createPayment({
        user_id: Number(user_id),
        subscription_id: subscriptionInsert.insertId,
        amount: paymentAmount,
        payment_method: normalizedPaymentMethod,
        payment_status: 'completed',
        upi_id: upiId,
        card_last4: cardLastFour,
        transaction_id: transactionId
      }, connection);

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Checkout completed successfully',
        data: {
          address_id: resolvedAddressId,
          combo_id: comboId,
          total_amount: Number(comboTotalAmount),
          subscription_id: subscriptionInsert.insertId,
          inserted_combo_items: comboItemValues.length,
          payment_id: paymentInsert.insertId,
          payment_amount: paymentAmount,
          transaction_id: transactionId
        }
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      if (error.message === 'Invalid start_date') {
        return res.status(400).json({ success: false, message: 'Invalid start_date' });
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

      const comboTotalAmount = normalizedItems
        .reduce((sum, item) => sum + (item.price * item.quantity), 0)
        .toFixed(2);

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
            name: String(combo_name || 'My Combo').trim(),
            total_amount: comboTotalAmount
          }, connection);

          resolvedComboId = comboInsert.insertId;
        } else {
          await connection.query(
            'UPDATE combos SET total_amount = ? WHERE combo_id = ?',
            [comboTotalAmount, resolvedComboId]
          );
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
            total_amount: Number(comboTotalAmount),
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
