const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const testUsers = [
  // Customers
  { name: 'Rajesh Kumar', email: 'rajesh.kumar@gmail.com', password: 'password123', phone: '9876543210', role: 'customer' },
  { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', password: 'password123', phone: '9876543211', role: 'customer' },
  { name: 'Amit Patel', email: 'amit.patel@gmail.com', password: 'password123', phone: '9876543212', role: 'customer' },
  { name: 'Sneha Reddy', email: 'sneha.reddy@gmail.com', password: 'password123', phone: '9876543213', role: 'customer' },
  // Delivery Partners
  { name: 'Ravi Verma', email: 'ravi.verma@example.com', password: 'password123', phone: '8765432100', role: 'delivery_partner' },
  { name: 'Arjun Singh', email: 'arjun.singh@example.com', password: 'password123', phone: '8765432101', role: 'delivery_partner' },
  { name: 'Deepa Nair', email: 'deepa.nair@example.com', password: 'password123', phone: '8765432102', role: 'delivery_partner' },
  { name: 'Vikram Joshi', email: 'vikram.joshi@example.com', password: 'password123', phone: '8765432103', role: 'delivery_partner' },
];

const items = [
  { name: 'Apple', price: 150, unit: 'kg', category: 'fruits', quantity: 50, quantity_unit: 'kg' },
  { name: 'Banana', price: 60, unit: 'dozen', category: 'fruits', quantity: 100, quantity_unit: 'dozen' },
  { name: 'Tomato', price: 40, unit: 'kg', category: 'vegetables', quantity: 80, quantity_unit: 'kg' },
  { name: 'Potato', price: 30, unit: 'kg', category: 'vegetables', quantity: 120, quantity_unit: 'kg' },
  { name: 'Milk', price: 65, unit: 'L', category: 'dairy', quantity: 200, quantity_unit: 'L' },
  { name: 'Paneer', price: 120, unit: '200g', category: 'dairy', quantity: 50, quantity_unit: 'packs' },
  { name: 'Almonds', price: 800, unit: 'kg', category: 'nuts', quantity: 30, quantity_unit: 'kg' },
  { name: 'Cashews', price: 900, unit: 'kg', category: 'nuts', quantity: 25, quantity_unit: 'kg' },
];

const addresses = [
  { street: '123 MG Road', area: 'Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038', landmark: 'Near Metro Station', latitude: 12.9716, longitude: 77.5946, type: 'home' },
  { street: '456 Residency Road', area: 'Ashok Nagar', city: 'Bangalore', state: 'Karnataka', pincode: '560025', landmark: 'Vittal Mallya Hospital', latitude: 12.9667, longitude: 77.6000, type: 'work' },
  { street: '789 Link Road', area: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053', landmark: 'Infinity Mall', latitude: 19.1136, longitude: 72.8697, type: 'home' },
  { street: '101 Cyber City', area: 'DLF Phase 3', city: 'Gurgaon', state: 'Haryana', pincode: '122002', landmark: 'Cyber Hub', latitude: 28.4950, longitude: 77.0878, type: 'other' },
];

async function seedDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      database: 'SE'
    });

    console.log("Connected to SE database for comprehensive seeding...");

    // 1. Seed Users
    const userIds = {};
    for (const user of testUsers) {
      const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [user.email]);
      if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const [result] = await connection.query(
          'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
          [user.name, user.email, hashedPassword, user.phone, user.role]
        );
        userIds[user.email] = result.insertId;
        console.log(`Created user: ${user.name}`);
      } else {
        userIds[user.email] = rows[0].id;
        console.log(`User already exists: ${user.email}`);
      }
    }

    // 2. Seed Items
    const itemIds = {};
    for (const item of items) {
      const [rows] = await connection.query('SELECT id FROM items WHERE name = ?', [item.name]);
      if (rows.length === 0) {
        const [result] = await connection.query(
          'INSERT INTO items (name, price, unit, category, quantity, quantity_unit) VALUES (?, ?, ?, ?, ?, ?)',
          [item.name, item.price, item.unit, item.category, item.quantity, item.quantity_unit]
        );
        itemIds[item.name] = result.insertId;
        console.log(`Created item: ${item.name}`);
      } else {
        itemIds[item.name] = rows[0].id;
        console.log(`Item already exists: ${item.name}`);
      }
    }

    // 3. Seed Addresses
    const addressIds = [];
    const customerEmails = testUsers.filter(u => u.role === 'customer').map(u => u.email);
    for (let i = 0; i < customerEmails.length; i++) {
        const email = customerEmails[i];
        const userId = userIds[email];
        const addr = addresses[i % addresses.length];
        
        const [rows] = await connection.query('SELECT address_id FROM addresses WHERE user_id = ? AND street = ?', [userId, addr.street]);
        if (rows.length === 0) {
            const [result] = await connection.query(
                'INSERT INTO addresses (user_id, street, area, city, state, pincode, landmark, latitude, longitude, address_type, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, addr.street, addr.area, addr.city, addr.state, addr.pincode, addr.landmark, addr.latitude, addr.longitude, addr.type, 1]
            );
            addressIds.push(result.insertId);
            console.log(`Created address for: ${email}`);
        } else {
            addressIds.push(rows[0].address_id);
            console.log(`Address already exists for: ${email}`);
        }
    }

    // 4. Seed Combos
    const comboIds = [];
    for (let i = 0; i < customerEmails.length; i++) {
        const email = customerEmails[i];
        const userId = userIds[email];
        const comboName = `Subscription Combo for ${testUsers.find(u => u.email === email).name}`;
        
        const [rows] = await connection.query('SELECT combo_id FROM combos WHERE user_id = ? AND name = ?', [userId, comboName]);
        if (rows.length === 0) {
            const [result] = await connection.query(
                'INSERT INTO combos (user_id, name, total_amount) VALUES (?, ?, ?)',
                [userId, comboName, 300.00]
            );
            const comboId = result.insertId;
            comboIds.push(comboId);
            
            // Add items to combo
            const selectedItems = ['Milk', 'Tomato', 'Potato'];
            for (const itemName of selectedItems) {
                await connection.query(
                    'INSERT INTO combo_items (combo_id, item_id, price, quantity) VALUES (?, ?, ?, ?)',
                    [comboId, itemIds[itemName], items.find(it => it.name === itemName).price, 1]
                );
            }
            console.log(`Created combo for: ${email}`);
        } else {
            comboIds.push(rows[0].combo_id);
            console.log(`Combo already exists for: ${email}`);
        }
    }

    // 5. Seed Subscriptions
    const subIds = [];
    for (let i = 0; i < customerEmails.length; i++) {
        const email = customerEmails[i];
        const userId = userIds[email];
        const addrId = addressIds[i];
        const comboId = comboIds[i];
        
        const [rows] = await connection.query('SELECT subscription_id FROM subscriptions WHERE user_id = ?', [userId]);
        if (rows.length === 0) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
            
            const [result] = await connection.query(
                'INSERT INTO subscriptions (user_id, address_id, combo_id, plan_type, delivery_slot, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, addrId, comboId, '1_month', 'morning', startDate, endDate, 'active']
            );
            subIds.push(result.insertId);
            console.log(`Created subscription for: ${email}`);
        } else {
            subIds.push(rows[0].subscription_id);
            console.log(`Subscription already exists for: ${email}`);
        }
    }

    // 6. Seed Orders
    for (let i = 0; i < customerEmails.length; i++) {
        const email = customerEmails[i];
        const userId = userIds[email];
        const addrId = addressIds[i];
        const comboId = comboIds[i];
        const subId = subIds[i];
        
        const [rows] = await connection.query('SELECT order_id FROM orders WHERE subscription_id = ?', [subId]);
        if (rows.length === 0) {
            const orderDate = new Date();
            const [result] = await connection.query(
                'INSERT INTO orders (subscription_id, customer_id, address_id, order_date, delivery_date, delivery_slot, combo_id, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [subId, userId, addrId, orderDate, orderDate, 'morning', comboId, 300.00, 'delivered']
            );
            console.log(`Created order for: ${email}`);
        } else {
            console.log(`Order already exists for: ${email}`);
        }
    }

    console.log("Comprehensive seeding completed successfully!");
  } catch (err) {
    console.error("Failed to seed database:", err.message);
  } finally {
    if (connection) await connection.end();
  }
}

seedDatabase();
