const db = require("../config/db");

/**
 * Insert a new address into the database
 * @param {object} addressData
 * @returns {object} insert result
 */
const createAddress = async ({
  user_id,
  street,
  area,
  city,
  state,
  pincode,
  landmark,
  latitude,
  longitude,
  address_type,
  is_default,
}) => {
  // If this address is set as default, unset any existing default for the user
  if (is_default) {
    await db.query(
      "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
      [user_id]
    );
  }

  const [result] = await db.query(
    `INSERT INTO addresses
      (user_id, street, area, city, state, pincode, landmark, latitude, longitude, address_type, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      street,
      area || null,
      city,
      state,
      pincode,
      landmark || null,
      latitude || null,
      longitude || null,
      address_type,
      is_default ? 1 : 0,
    ]
  );

  return result;
};

/**
 * Get all addresses for a given user
 * @param {number} userId
 * @returns {Array} list of address rows
 */
const getAddressesByUserId = async (userId) => {
  const [rows] = await db.query(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId]
  );
  return rows;
};

/**
 * Get a single address by its ID
 * @param {number} addressId
 * @returns {object|null}
 */
const getAddressById = async (addressId) => {
  const [rows] = await db.query(
    "SELECT * FROM addresses WHERE address_id = ?",
    [addressId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Update an address by ID for a given user.
 * @param {number} addressId
 * @param {number} userId
 * @param {object} payload
 * @returns {object} update result
 */
const updateAddressById = async (addressId, userId, payload) => {
  const {
    street,
    area,
    city,
    state,
    pincode,
    landmark,
    latitude,
    longitude,
    address_type,
    is_default,
  } = payload;

  if (is_default) {
    await db.query(
      "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
      [userId]
    );
  }

  const [result] = await db.query(
    `UPDATE addresses
     SET street = ?, area = ?, city = ?, state = ?, pincode = ?, landmark = ?,
         latitude = ?, longitude = ?, address_type = ?, is_default = ?
     WHERE address_id = ? AND user_id = ?`,
    [
      street,
      area || null,
      city,
      state,
      pincode,
      landmark || null,
      latitude,
      longitude,
      address_type,
      is_default ? 1 : 0,
      addressId,
      userId,
    ]
  );

  return result;
};

/**
 * Delete an address by ID for a given user.
 * @param {number} addressId
 * @param {number} userId
 * @returns {object} delete result
 */
const deleteAddressById = async (addressId, userId) => {
  const [result] = await db.query(
    "DELETE FROM addresses WHERE address_id = ? AND user_id = ?",
    [addressId, userId]
  );
  return result;
};

/**
 * Check whether an address is linked to any subscription.
 * @param {number} addressId
 * @returns {boolean}
 */
const isAddressLinkedToSubscription = async (addressId) => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS subscriptionCount FROM subscriptions WHERE address_id = ?",
    [addressId]
  );

  return Number(rows[0]?.subscriptionCount || 0) > 0;
};

module.exports = {
  createAddress,
  getAddressesByUserId,
  getAddressById,
  updateAddressById,
  deleteAddressById,
  isAddressLinkedToSubscription,
};
