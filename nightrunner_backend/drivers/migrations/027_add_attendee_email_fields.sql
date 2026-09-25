-- Add primary_email and secondary_email columns to event_attendees.
-- Used for parent contact (primary) and youth's own email (secondary).

ALTER TABLE event_attendees ADD COLUMN primary_email TEXT;
ALTER TABLE event_attendees ADD COLUMN secondary_email TEXT;
