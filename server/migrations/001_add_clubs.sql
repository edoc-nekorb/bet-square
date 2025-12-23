-- Clubs Management Table
CREATE TABLE IF NOT EXISTS clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  short_name VARCHAR(10),
  logo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Predictions Table
ALTER TABLE predictions 
ADD COLUMN home_club_id INT,
ADD COLUMN away_club_id INT,
ADD COLUMN match_date DATE,
ADD COLUMN result_status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
ADD FOREIGN KEY (home_club_id) REFERENCES clubs(id) ON DELETE SET NULL,
ADD FOREIGN KEY (away_club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- Insert some common clubs
INSERT IGNORE INTO clubs (name, short_name) VALUES
('Manchester City', 'MCI'),
('Arsenal', 'ARS'),
('Liverpool', 'LIV'),
('Chelsea', 'CHE'),
('Manchester United', 'MUN'),
('Tottenham Hotspur', 'TOT'),
('Newcastle United', 'NEW'),
('Brighton', 'BHA'),
('Real Madrid', 'RMA'),
('Barcelona', 'BAR'),
('Bayern Munich', 'BAY'),
('Paris Saint-Germain', 'PSG'),
('Inter Milan', 'INT'),
('AC Milan', 'ACM'),
('Juventus', 'JUV'),
('Napoli', 'NAP'),
('Atletico Madrid', 'ATM'),
('Borussia Dortmund', 'DOR');
