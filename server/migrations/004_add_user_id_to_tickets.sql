ALTER TABLE split_tickets ADD COLUMN user_id INT;
ALTER TABLE split_tickets ADD INDEX idx_user_id (user_id);
