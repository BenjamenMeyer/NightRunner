-- drivers/migrations/017_attendee_roster.sql
--
-- Attendee roster: troops, per-event attendees, and gate arrivals.
--
-- "Arrivals" is deliberately distinct from station_visits: a station visit is a
-- patrol reaching a station during the event, an arrival is a person physically
-- turning up at the gate.

CREATE TABLE IF NOT EXISTS troops (
    id TEXT PRIMARY KEY, -- UUIDv7
    number TEXT NOT NULL UNIQUE, -- canonical troop code, e.g. GA-0594
    name TEXT
);

CREATE TABLE IF NOT EXISTS event_attendees (
    id TEXT PRIMARY KEY, -- UUIDv7, NightRunner's own identity for this person
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    troop_id TEXT REFERENCES troops(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    -- Youth, Adult, or Non-participant Youth. A 'Staff' value from the sheet
    -- maps to Adult, and the raw value is preserved in source_category.
    category TEXT NOT NULL DEFAULT 'Youth',
    source_category TEXT,
    phone TEXT,
    emergency_contact_1 TEXT,
    emergency_contact_2 TEXT,
    -- Normalised troop|last|first, used to match re-imports to existing people.
    source_key TEXT NOT NULL,
    -- Distinguishes two genuinely different people who share a match key.
    -- Only ever incremented by an explicit operator decision during import.
    key_ordinal INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_identity
    ON event_attendees (event_id, source_key, key_ordinal);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_troop
    ON event_attendees (event_id, troop_id);

CREATE TABLE IF NOT EXISTS arrivals (
    id TEXT PRIMARY KEY, -- UUIDv7
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    -- One arrival per person. Re-checking in is a no-op, not a duplicate row.
    attendee_id TEXT NOT NULL UNIQUE REFERENCES event_attendees(id) ON DELETE CASCADE,
    arrived_at TEXT NOT NULL,
    recorded_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_arrivals_event ON arrivals (event_id);

-- Nullable: patrol members added by hand keep working exactly as before.
ALTER TABLE patrol_members ADD COLUMN attendee_id TEXT;
