-- Create Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial plans
INSERT INTO subscription_plans (name, price, duration_days, description) VALUES
('Bi-Weekly', 3000.00, 14, 'Access to Smart Split and Full Predictions for 14 days'),
('Monthly', 5000.00, 30, 'Access to Smart Split and Full Predictions for 30 days'),
('Quarterly', 13500.00, 90, 'Access to Smart Split and Full Predictions for 3 months');

-- Add plan expiration to users
ALTER TABLE users
ADD COLUMN plan_expires_at DATETIME DEFAULT NULL;

-- Create User Subscriptions table for history
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    status ENUM('active', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);
