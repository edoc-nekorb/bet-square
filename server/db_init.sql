-- Create Database
CREATE DATABASE IF NOT EXISTS bet_square_db;
USE bet_square_db;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('user', 'admin', 'vip') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEWS TABLE
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  status ENUM('Draft', 'Published') DEFAULT 'Draft',
  date DATE DEFAULT (CURRENT_DATE),
  image TEXT,
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_name VARCHAR(255) NOT NULL, -- 'match' is reserved keyword in some SQL
  outcome VARCHAR(255) NOT NULL,
  odds VARCHAR(50),
  confidence ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  status ENUM('Draft', 'Published') DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MATCH INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS match_insights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  excerpt TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Admin (Password: password123)
-- Hash generated for 'password123' using bcrypt
INSERT IGNORE INTO users (email, password, full_name, role) 
VALUES ('admin@betsquare.com', '$2a$10$X7.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'Admin User', 'admin');
