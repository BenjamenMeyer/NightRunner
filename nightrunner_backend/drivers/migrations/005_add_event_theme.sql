-- drivers/migrations/005_add_event_theme.sql

ALTER TABLE events ADD COLUMN theme TEXT DEFAULT 'night-ops';
