const db = require("../config/db");

/**
 * Find a user by their email address
 * @param {string} email
 * @returns {object|null} user row or null
 */
const findByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Insert a new user into the database
 * @param {object} userData - { name, email, password, phone, role }
 * @returns {object} insert result
 */
const createUser = async ({ name, email, password, phone, role }) => {
  const [result] = await db.query(
    "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
    [name, email, password, phone, role]
  );
  return result;
};

/**
 * Count all users in the system.
 * @returns {number}
 */
const getTotalUsersCount = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS totalUsers FROM users");
  return rows[0]?.totalUsers || 0;
};

/**
 * Count all delivery partners in the system.
 * @returns {number}
 */
const getDeliveryPartnersCount = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS activePartners FROM users WHERE LOWER(REPLACE(role, ' ', '_')) = ?",
    ["delivery_partner"]
  );
  return rows[0]?.activePartners || 0;
};

module.exports = {
  findByEmail,
  createUser,
  getTotalUsersCount,
  getDeliveryPartnersCount,
};
