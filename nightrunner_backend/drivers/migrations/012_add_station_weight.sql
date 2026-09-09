-- Add station_weight column to stations table
ALTER TABLE stations ADD COLUMN station_weight REAL NOT NULL DEFAULT 1.0;
