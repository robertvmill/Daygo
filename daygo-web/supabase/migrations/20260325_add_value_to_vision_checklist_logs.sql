ALTER TABLE vision_checklist_logs
  ADD COLUMN IF NOT EXISTS value integer;

NOTIFY pgrst, 'reload schema';
