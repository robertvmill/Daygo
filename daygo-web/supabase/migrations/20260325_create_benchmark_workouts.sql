-- Benchmark workouts: user-defined workout templates they repeatedly try to improve
CREATE TABLE IF NOT EXISTS benchmark_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_workouts_user_id ON benchmark_workouts(user_id);

ALTER TABLE benchmark_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own benchmark workouts" ON benchmark_workouts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own benchmark workouts" ON benchmark_workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own benchmark workouts" ON benchmark_workouts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own benchmark workouts" ON benchmark_workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Segments within a benchmark workout (ordered exercises/intervals)
CREATE TABLE IF NOT EXISTS benchmark_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES benchmark_workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric_label TEXT NOT NULL DEFAULT 'time',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_segments_workout_id ON benchmark_segments(workout_id);

ALTER TABLE benchmark_segments ENABLE ROW LEVEL SECURITY;

-- Segments inherit access through workout ownership
CREATE POLICY "Users can view segments of their workouts" ON benchmark_segments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM benchmark_workouts WHERE id = workout_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert segments for their workouts" ON benchmark_segments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM benchmark_workouts WHERE id = workout_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update segments of their workouts" ON benchmark_segments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM benchmark_workouts WHERE id = workout_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete segments of their workouts" ON benchmark_segments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM benchmark_workouts WHERE id = workout_id AND user_id = auth.uid())
  );
