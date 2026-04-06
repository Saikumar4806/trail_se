const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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
        role ENUM('customer', 'admin', 'delivery_partner') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createUsersTableQuery);
    console.log("Verified 'users' table exists and is correctly structured.");

    // Automatically create the default admin user with hashed password
    const adminEmail = 'admin@gmail.com';
    const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin1002', 10);
      await connection.query(
        'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', adminEmail, hashedPassword, '9999999999', 'admin']
      );
      console.log("Automatically created default admin: admin@gmail.com");
    } else {
      console.log("Default admin already exists: admin@gmail.com");
    }

    // Create the items table
    const createItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        quantity INT DEFAULT 0,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createItemsTableQuery);
    console.log("Verified 'items' table exists and is correctly structured.");

    console.log("Database setup is 100% complete! You can now run the server.");
    await connection.end();

  } catch (err) {
    console.error("Failed to setup database:", err.message);
  }
}

setupDatabase();
