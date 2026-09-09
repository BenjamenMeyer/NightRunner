-- drivers/migrations/013_add_patrol_communication_info.sql

ALTER TABLE patrols ADD COLUMN phone_number TEXT;
ALTER TABLE patrols ADD COLUMN radio_frequency TEXT;
ALTER TABLE patrols ADD COLUMN has_radio BOOLEAN DEFAULT FALSE;
ALTER TABLE patrols ADD COLUMN radio_identifier TEXT;
