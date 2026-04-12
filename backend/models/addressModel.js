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

module.exports = {
  createAddress,
  getAddressesByUserId,
  getAddressById,
};
