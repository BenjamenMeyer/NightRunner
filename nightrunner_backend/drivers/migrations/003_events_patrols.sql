-- drivers/migrations/003_events_patrols.sql

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, -- UUIDv7
    name TEXT NOT NULL,
    date TEXT,
    description TEXT,
    rounding_precision INTEGER DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS event_organizers (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS patrols (
    id TEXT PRIMARY KEY, -- UUIDv7
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patrol_members (
    id TEXT PRIMARY KEY, -- UUIDv7
    patrol_id TEXT REFERENCES patrols(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rank TEXT,
    troop TEXT
);

CREATE TABLE IF NOT EXISTS event_patrols (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    patrol_id TEXT REFERENCES patrols(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, patrol_id)
);

CREATE TABLE IF NOT EXISTS event_stations (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    station_id TEXT, -- Placeholder for when stations are implemented
    PRIMARY KEY (event_id, station_id)
);
