-- drivers/migrations/002_user_roles.sql
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT REFERENCES users(id),
    role TEXT,
    PRIMARY KEY (user_id, role)
);
