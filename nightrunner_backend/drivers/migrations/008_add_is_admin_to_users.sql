-- drivers/migrations/008_add_is_admin_to_users.sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
