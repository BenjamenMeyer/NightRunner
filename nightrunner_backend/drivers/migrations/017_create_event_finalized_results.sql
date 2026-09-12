-- drivers/migrations/017_create_event_finalized_results.sql
-- Create event_finalized_results table to store calculated final event & station scores
CREATE TABLE IF NOT EXISTS event_finalized_results (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    patrol_id TEXT NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL DEFAULT 'final', -- 'station' or 'final'
    score_value REAL NOT NULL DEFAULT 0.0,
    scoring_mode TEXT NOT NULL DEFAULT 'absolute', -- 'absolute' or 'relative'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finalized_results_event_patrol ON event_finalized_results(event_id, patrol_id);
