-- Migration 020: Add participant_count column to scores table
ALTER TABLE scores ADD COLUMN participant_count INTEGER DEFAULT 1;
