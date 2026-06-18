-- drivers/migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUIDv7
    external_id TEXT UNIQUE, -- OAuth 'sub'
    username TEXT,
    email TEXT,
    display_name TEXT
);
