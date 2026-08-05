-- drivers/migrations/004_create_stations.sql
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY, -- UUIDv7
    name TEXT NOT NULL,
    description TEXT,
    active_configuration_id TEXT REFERENCES configurations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS station_configurations (
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    config_id TEXT REFERENCES configurations(id) ON DELETE CASCADE,
    PRIMARY KEY (station_id, config_id)
);
