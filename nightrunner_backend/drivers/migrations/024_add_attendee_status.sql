-- drivers/migrations/024_add_attendee_status.sql
--
-- Add status and status_note columns to event_attendees for tracking "Not coming" attendees.
--

ALTER TABLE event_attendees ADD COLUMN status TEXT NOT NULL DEFAULT 'coming';
ALTER TABLE event_attendees ADD COLUMN status_note TEXT;
