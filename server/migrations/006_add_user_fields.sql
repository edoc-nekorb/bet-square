ALTER TABLE users
ADD COLUMN status ENUM('Active', 'Suspended') DEFAULT 'Active',
ADD COLUMN plan ENUM('free', 'premium') DEFAULT 'free';
