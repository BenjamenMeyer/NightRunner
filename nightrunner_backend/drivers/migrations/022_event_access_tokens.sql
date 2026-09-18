-- drivers/migrations/022_event_access_tokens.sql
--
-- Unguessable per-event links, so two things can happen without an account:
-- a station volunteer checking patrols in and out, and a spectator watching
-- patrol progress.
--
-- Only a hash of the token is stored. A database dump therefore does not hand
-- over working links. The plaintext is shown once, when the link is created.

CREATE TABLE IF NOT EXISTS event_access_tokens (
    id TEXT PRIMARY KEY, -- UUIDv7
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- SHA-256 of the plaintext token, hex encoded. Unique so a lookup is a
    -- single indexed read rather than a scan-and-compare.
    token_hash TEXT NOT NULL UNIQUE,
    -- 'progress' is read-only and safe to share widely. 'checkin' can write
    -- visit records. A token is always resolved against the scope the endpoint
    -- expects, so presenting a progress token to a check-in route 404s.
    scope TEXT NOT NULL DEFAULT 'progress',
    -- Null means a checkin link covers every station at the event and the
    -- volunteer chooses. Set, it would pin the link to one station. Nothing
    -- issues a pinned token yet. The column exists so doing so is not a schema
    -- change. Unused by progress tokens.
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    -- Free text so an organiser can tell two links apart: "Gate laptop",
    -- "Printed QR, station 4", "Posted to the parents group".
    label TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    -- Lets an organiser see whether a link is actually being used, and spot a
    -- link still live after the event.
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_access_tokens_event
    ON event_access_tokens (event_id, scope);
