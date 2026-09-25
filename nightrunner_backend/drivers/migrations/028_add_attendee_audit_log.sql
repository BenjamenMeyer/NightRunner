-- Add audit_log table for tracking edits to event attendees (e.g., changes during check-in confirmation)
CREATE TABLE IF NOT EXISTS attendee_audit_log (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendee_id TEXT NOT NULL REFERENCES event_attendees(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by TEXT,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendee_audit_log_event ON attendee_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_attendee_audit_log_attendee ON attendee_audit_log(attendee_id);
