-- Migration to create compiled_reports table
CREATE TABLE IF NOT EXISTS compiled_reports (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generating', -- 'generating', 'ready', 'failed'
    file_key TEXT,
    content_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compiled_reports_event ON compiled_reports(event_id);
