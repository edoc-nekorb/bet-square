ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reference VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    type ENUM('deposit', 'withdrawal') DEFAULT 'deposit',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
