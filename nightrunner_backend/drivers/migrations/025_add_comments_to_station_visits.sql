-- Add comments column to station_visits table to store overall judge/scorer comments
ALTER TABLE station_visits ADD COLUMN comments TEXT;
