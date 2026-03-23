-- Insert default admin, customer, and delivery users for testing
USE subscription_db;

-- Insert admin (predefined)

-- Insert admin (predefined, password: admin123)
INSERT INTO users (name, email, password, phone, role) VALUES
('admin', 'admin@gmail.com', 'admin123', '9999999999', 'admin');

-- Insert 3 test customers (password: cus123)
INSERT INTO users (name, email, password, phone, role) VALUES
('cus1', 'cus1@gmail.com', 'cus123', '9000000001', 'customer'),
('cus2', 'cus2@gmail.com', 'cus123', '9000000002', 'customer'),
('cus3', 'cus3@gmail.com', 'cus123', '9000000003', 'customer');

-- Insert 3 test delivery partners (password: del123)
INSERT INTO users (name, email, password, phone, role) VALUES
('del1', 'del1@example.com', 'del123', '8000000001', 'delivery_partner'),
('del2', 'del2@example.com', 'del123', '8000000002', 'delivery_partner'),
('del3', 'del3@example.com', 'del123', '8000000003', 'delivery_partner');
