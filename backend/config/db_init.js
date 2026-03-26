const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../../.env' });

async function setupDatabase() {
  try {
    // Connect to the MySQL server (without specifying a database yet)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'Saikumar@2005',
    });

    console.log("Connected to MySQL server...");

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS SE;');
    console.log("Verified database 'SE' exists.");

    // Switch to the newly created database
    await connection.query('USE SE;');

    // Create the users table
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        -- Keep role values consistent with the rest of the app:
        --  customer | admin | delivery_partner
        role ENUM('customer', 'admin', 'delivery_partner') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createUsersTableQuery);
    console.log("Verified 'users' table exists and is correctly structured.");

    console.log("Database setup is 100% complete! You can now run the server.");
    await connection.end();

  } catch (err) {
    console.error("Failed to setup database:", err.message);
  }
}

setupDatabase();
