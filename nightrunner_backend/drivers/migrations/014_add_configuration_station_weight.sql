-- Add station_weight column to configurations table
ALTER TABLE configurations ADD COLUMN station_weight REAL NOT NULL DEFAULT 1.0;
