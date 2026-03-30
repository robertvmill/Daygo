-- Add meal_type column to meal_inspirations if the table was already created without it
ALTER TABLE meal_inspirations ADD COLUMN IF NOT EXISTS meal_type TEXT NOT NULL DEFAULT 'lunch' CHECK (meal_type IN ('lunch', 'dinner'));
