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

-- Ensure station_id and configuration_id columns exist if table was created in an earlier migration step
ALTER TABLE station_tasks ADD COLUMN IF NOT EXISTS configuration_id TEXT REFERENCES configurations(id) ON DELETE CASCADE;
ALTER TABLE station_tasks ADD COLUMN IF NOT EXISTS station_id TEXT REFERENCES stations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_station_tasks_config_id ON station_tasks(configuration_id);
CREATE INDEX IF NOT EXISTS idx_station_tasks_station_id ON station_tasks(station_id);

