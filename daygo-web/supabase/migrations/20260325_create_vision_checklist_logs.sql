CREATE TABLE IF NOT EXISTS vision_checklist_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pillar_index integer NOT NULL,
  item_index integer NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, pillar_index, item_index, date)
);

CREATE INDEX IF NOT EXISTS vision_checklist_logs_user_date_idx
  ON vision_checklist_logs(user_id, date);

ALTER TABLE vision_checklist_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vision checklist logs"
  ON vision_checklist_logs FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
