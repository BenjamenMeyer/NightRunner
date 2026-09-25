-- docs/sql_scripts/backfill_user_last_active.sql
--
-- Manual utility script to backfill `last_active_at` for existing users.
-- Sets last_active_at to 30 days ago ONLY for users created over 4 days ago
-- who do not already have a last_active_at timestamp set.

-- SQLite version:
UPDATE users
SET last_active_at = datetime('now', '-30 days')
WHERE (last_active_at IS NULL OR last_active_at = '')
  AND (created_at IS NOT NULL AND datetime(created_at) < datetime('now', '-4 days'));

-- PostgreSQL version (uncomment if running on Postgres):
-- UPDATE users
-- SET last_active_at = NOW() - INTERVAL '30 days'
-- WHERE last_active_at IS NULL
--   AND (created_at IS NOT NULL AND created_at < (NOW() - INTERVAL '4 days'));
