-- drivers/migrations/029_add_user_activity_timestamps.sql

ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP;

-- Populate created_at for existing users if null
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
