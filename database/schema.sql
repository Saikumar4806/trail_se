-- =============================================
-- Subscription Delivery System — Users Table
-- =============================================

CREATE DATABASE IF NOT EXISTS SE;
USE SE;

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

-- Migration: delivery partner's current GPS location (set via the map page)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10,8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11,8) DEFAULT NULL;

-- =============================================
-- Subscription Delivery System — Items Table
-- =============================================

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

-- =============================================
-- Subscription Delivery System — Combos Table
-- =============================================

CREATE TABLE IF NOT EXISTS combos (
    combo_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100),
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Subscription Delivery System — Combo Items Table
-- =============================================

CREATE TABLE IF NOT EXISTS combo_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    combo_id INT NOT NULL,
    item_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (combo_id) REFERENCES combos(combo_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- =============================================
-- Subscription Delivery System — Addresses Table
-- =============================================

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

-- =============================================
-- Subscription Delivery System — Subscriptions Table
-- =============================================

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
