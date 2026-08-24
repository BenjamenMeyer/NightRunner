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
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patrol_members (
    id TEXT PRIMARY KEY, -- UUIDv7
    patrol_id TEXT REFERENCES patrols(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rank TEXT,
    troop TEXT
);
