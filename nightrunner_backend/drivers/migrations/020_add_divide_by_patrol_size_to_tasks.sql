-- drivers/migrations/020_add_divide_by_patrol_size_to_tasks.sql
-- Add divide_by_patrol_size boolean flag to station_tasks table

ALTER TABLE station_tasks ADD COLUMN divide_by_patrol_size BOOLEAN NOT NULL DEFAULT FALSE;
