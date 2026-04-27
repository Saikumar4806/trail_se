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
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
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
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(15),
        role ENUM('customer', 'admin', 'delivery_partner') NOT NULL,
        status ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createUsersTableQuery);
    console.log("Verified 'users' table exists and is correctly structured.");

    // Add status column if it doesn't exist (for existing databases)
    try {
      await connection.query(
        "ALTER TABLE users ADD COLUMN status ENUM('active', 'blocked') NOT NULL DEFAULT 'active' AFTER role"
      );
      console.log("Added 'status' column to users table.");
    } catch (alterErr) {
      if (alterErr.code === 'ER_DUP_FIELDNAME') {
        console.log("'status' column already exists in users table.");
      } else {
        throw alterErr;
      }
    }

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
        unit VARCHAR(20) DEFAULT 'unit',
        category ENUM('fruits','vegetables','dairy','nuts'),
        quantity INT DEFAULT 0,
        quantity_unit VARCHAR(20),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createItemsTableQuery);
    console.log("Verified 'items' table exists and is correctly structured.");

    // Create the combos table
    const createCombosTableQuery = `
      CREATE TABLE IF NOT EXISTS combos (
        combo_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100),
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    await connection.query(createCombosTableQuery);
    console.log("Verified 'combos' table exists and is correctly structured.");

    // Create the combo_items table
    const createComboItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS combo_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        combo_id INT NOT NULL,
        item_id INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (combo_id) REFERENCES combos(combo_id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );
    `;
    await connection.query(createComboItemsTableQuery);
    console.log("Verified 'combo_items' table exists and is correctly structured.");

    // Create the addresses table
    const createAddressesTableQuery = `
      CREATE TABLE IF NOT EXISTS addresses (
        address_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        street VARCHAR(255) NOT NULL,
        area VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(255),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        address_type ENUM('home', 'work', 'other') DEFAULT 'home',
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    await connection.query(createAddressesTableQuery);
    console.log("Verified 'addresses' table exists and is correctly structured.");

    // Create the subscriptions table
    const createSubscriptionsTableQuery = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        subscription_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        address_id INT NOT NULL,
        combo_id INT NOT NULL,
        plan_type ENUM('weekly', '1_month', '3_months', 'yearly') NOT NULL,
        delivery_slot ENUM('morning', 'evening') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
        pause_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE,
        FOREIGN KEY (combo_id) REFERENCES combos(combo_id) ON DELETE CASCADE
      );
    `;
    await connection.query(createSubscriptionsTableQuery);
    console.log("Verified 'subscriptions' table exists and is correctly structured.");

    // Create the orders table
    const createOrdersTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        customer_id INT NOT NULL,
        address_id INT NOT NULL,
        partner_id INT DEFAULT NULL,
        order_date DATE NOT NULL,
        delivery_date DATE NOT NULL,
        delivery_slot ENUM('morning','evening') NOT NULL,
        combo_id INT,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('out_for_delivery','delivered') DEFAULT 'out_for_delivery',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE
      );
    `;
    await connection.query(createOrdersTableQuery);
    console.log("Verified 'orders' table exists and is correctly structured.");

    // Add partner_id column if it doesn't exist (for existing tables)
    try {
      await connection.query(
        `ALTER TABLE orders ADD COLUMN partner_id INT DEFAULT NULL AFTER address_id`
      );
      console.log("Added 'partner_id' column to orders table.");
    } catch (alterErr) {
      if (alterErr.code === 'ER_DUP_FIELDNAME') {
        console.log("'partner_id' column already exists in orders table.");
      } else {
        throw alterErr;
      }
    }

    // Create the payments table
    const createPaymentsTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_id INT,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('card','upi','cash') NOT NULL,
        payment_status ENUM('pending','completed','failed') DEFAULT 'pending',
        upi_id VARCHAR(100),
        card_last4 VARCHAR(4),
        transaction_id VARCHAR(255),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
      );
    `;
    await connection.query(createPaymentsTableQuery);
    console.log("Verified 'payments' table exists and is correctly structured.");

    console.log("Database setup is 100% complete! You can now run the server.");
    await connection.end();

  } catch (err) {
    console.error("Failed to setup database:", err.message);
  }
}

setupDatabase();
