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

module.exports = { findByEmail, createUser };
