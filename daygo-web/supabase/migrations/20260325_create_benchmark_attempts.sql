-- Benchmark attempts: each time a user performs a benchmark workout
CREATE TABLE IF NOT EXISTS benchmark_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES benchmark_workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_attempts_workout_id ON benchmark_attempts(workout_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_attempts_user_id ON benchmark_attempts(user_id);

ALTER TABLE benchmark_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own benchmark attempts" ON benchmark_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own benchmark attempts" ON benchmark_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own benchmark attempts" ON benchmark_attempts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own benchmark attempts" ON benchmark_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- Values recorded for each segment in an attempt
CREATE TABLE IF NOT EXISTS benchmark_attempt_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES benchmark_attempts(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES benchmark_segments(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_attempt_values_attempt_id ON benchmark_attempt_values(attempt_id);

ALTER TABLE benchmark_attempt_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view values of their attempts" ON benchmark_attempt_values
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM benchmark_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert values for their attempts" ON benchmark_attempt_values
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM benchmark_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update values of their attempts" ON benchmark_attempt_values
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM benchmark_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete values of their attempts" ON benchmark_attempt_values
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM benchmark_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
