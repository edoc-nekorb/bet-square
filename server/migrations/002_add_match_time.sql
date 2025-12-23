-- Migration to add match_time to predictions
ALTER TABLE predictions 
ADD COLUMN match_time TIME DEFAULT '00:00:00';
