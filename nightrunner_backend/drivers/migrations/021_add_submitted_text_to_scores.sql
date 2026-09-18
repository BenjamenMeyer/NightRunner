-- drivers/migrations/021_add_submitted_text_to_scores.sql
-- Add submitted_text TEXT column to scores table to store raw text responses, cipher submissions, and disqualification reasons

ALTER TABLE scores ADD COLUMN submitted_text TEXT;
