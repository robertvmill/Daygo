CREATE TABLE IF NOT EXISTS home_visions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'My Roadmap',
  subtitle text,
  pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_title text,
  rule_text text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS home_visions_user_idx ON home_visions(user_id);

ALTER TABLE home_visions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_visions' AND policyname = 'Users can manage their own home vision'
  ) THEN
    CREATE POLICY "Users can manage their own home vision"
      ON home_visions FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
