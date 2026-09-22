-- drivers/migrations/023_add_attendee_compliance_fields.sql
--
-- Add member_id and youth_protection_completed columns to event_attendees.
--

ALTER TABLE event_attendees ADD COLUMN member_id TEXT;
ALTER TABLE event_attendees ADD COLUMN youth_protection_completed BOOLEAN DEFAULT FALSE;
