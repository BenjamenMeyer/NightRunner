-- Add status and unlocked_by columns to station_visits table
ALTER TABLE station_visits ADD COLUMN status TEXT DEFAULT 'checked_in';
ALTER TABLE station_visits ADD COLUMN unlocked_by TEXT;
