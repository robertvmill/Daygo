-- Add time_of_day column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS time_of_day text NULL;
