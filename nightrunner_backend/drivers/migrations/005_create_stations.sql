-- drivers/migrations/004_create_stations.sql
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY, -- UUIDv7
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active_configuration_id TEXT REFERENCES configurations(id) ON DELETE SET NULL
);
