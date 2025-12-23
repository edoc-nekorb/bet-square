CREATE TABLE IF NOT EXISTS split_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL,
    bookmaker VARCHAR(50) NOT NULL,
    booking_code VARCHAR(50) NOT NULL,
    total_odds DECIMAL(10, 2) NOT NULL,
    match_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
