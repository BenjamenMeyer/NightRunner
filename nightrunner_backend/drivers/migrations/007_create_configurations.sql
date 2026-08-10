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
