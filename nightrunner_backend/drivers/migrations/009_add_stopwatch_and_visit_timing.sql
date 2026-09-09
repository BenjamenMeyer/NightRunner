-- Add station_visits table for queue and activity timing, and extend scores table with timing metadata
CREATE TABLE IF NOT EXISTS station_visits (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    patrol_id TEXT NOT NULL,
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    tasks_started_at TIMESTAMP,
    tasks_completed_at TIMESTAMP,
    entry_mode TEXT DEFAULT 'live',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (patrol_id) REFERENCES patrols(id) ON DELETE CASCADE
);

ALTER TABLE scores ADD COLUMN started_at TIMESTAMP;
ALTER TABLE scores ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE scores ADD COLUMN entry_mode TEXT DEFAULT 'live';
