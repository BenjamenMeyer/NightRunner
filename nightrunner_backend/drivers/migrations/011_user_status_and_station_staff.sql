-- drivers/migrations/011_user_status_and_station_staff.sql

ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending';

-- Update existing users to 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '' OR status = 'pending';

CREATE TABLE IF NOT EXISTS station_staff (
    station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    PRIMARY KEY (station_id, user_id)
);
