-- drivers/migrations/007_create_configurations.sql
CREATE TABLE IF NOT EXISTS configuration_groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS configurations (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES configuration_groups(id) ON DELETE CASCADE,
    key TEXT,
    value TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS station_tasks (
    id TEXT PRIMARY KEY,
    configuration_id TEXT REFERENCES configurations(id) ON DELETE CASCADE,
    description TEXT,
    score_value TEXT, -- JSON configuration string mapping to ScoreValue properties
    score_weight REAL NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
