-- drivers/migrations/018_add_patrol_number.sql
--
-- Patrols had only a UUID and a name. Events need a short number to call a
-- patrol by, on a radio or a scoring sheet.

ALTER TABLE patrols ADD COLUMN number INTEGER;

-- Backfill existing patrols with sequential numbers within their event.
-- Ordered by id rather than rowid: ids are UUIDv7 and therefore already in
-- creation order, and rowid does not exist on PostgreSQL.
UPDATE patrols
SET number = (
    SELECT COUNT(*)
    FROM patrols AS earlier
    WHERE earlier.event_id = patrols.event_id
      AND earlier.id <= patrols.id
)
WHERE number IS NULL;

-- Numbers are unique within an event, not globally. Patrol 1 exists at every
-- event. NULL is permitted so a patrol can exist before it is numbered.
CREATE UNIQUE INDEX IF NOT EXISTS idx_patrols_event_number
    ON patrols (event_id, number);
