-- drivers/migrations/016_normalize_station_tasks_table.sql
-- Create relational station_tasks table supporting both configurations and stations
CREATE TABLE IF NOT EXISTS station_tasks (
    id TEXT PRIMARY KEY,
    configuration_id TEXT REFERENCES configurations(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    description TEXT,
    type TEXT NOT NULL DEFAULT 'Timed Challenge',
    instructions TEXT,
    max_score REAL DEFAULT 100,
    time_limit REAL DEFAULT 0,
    score_value TEXT,
    score_weight REAL NOT NULL DEFAULT 1.0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ensure all normalized columns exist if station_tasks table was created in an earlier migration step
ALTER TABLE station_tasks ADD COLUMN configuration_id TEXT REFERENCES configurations(id) ON DELETE CASCADE;
ALTER TABLE station_tasks ADD COLUMN station_id TEXT REFERENCES stations(id) ON DELETE CASCADE;
ALTER TABLE station_tasks ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE station_tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'Timed Challenge';
ALTER TABLE station_tasks ADD COLUMN instructions TEXT;
ALTER TABLE station_tasks ADD COLUMN max_score REAL DEFAULT 100;
ALTER TABLE station_tasks ADD COLUMN time_limit REAL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_station_tasks_config_id ON station_tasks(configuration_id);
CREATE INDEX IF NOT EXISTS idx_station_tasks_station_id ON station_tasks(station_id);

