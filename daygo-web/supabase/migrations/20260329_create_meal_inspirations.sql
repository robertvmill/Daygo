-- Create meal_inspirations table
-- Stores daily meal inspiration entries with optional meal and ingredient photos

CREATE TABLE IF NOT EXISTS meal_inspirations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL DEFAULT 'lunch' CHECK (meal_type IN ('lunch', 'dinner')),
  title TEXT,
  notes TEXT,
  meal_image_url TEXT,
  ingredients_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE meal_inspirations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own meal inspirations" ON meal_inspirations
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own meal inspirations" ON meal_inspirations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own meal inspirations" ON meal_inspirations
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own meal inspirations" ON meal_inspirations
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for efficient daily queries
CREATE INDEX IF NOT EXISTS meal_inspirations_user_date_idx ON meal_inspirations(user_id, date);
