import { supabase } from '@/lib/supabase'
import type { BenchmarkWorkout, BenchmarkSegment, BenchmarkWorkoutWithSegments } from '@/lib/types/database'

// Cast needed until Supabase types are regenerated after migration
const db = supabase as any

export const benchmarkWorkoutsService = {
  async getWorkouts(userId: string): Promise<BenchmarkWorkoutWithSegments[]> {
    const { data: workouts, error } = await db
      .from('benchmark_workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!workouts || workouts.length === 0) return []

    const { data: segments, error: segError } = await db
      .from('benchmark_segments')
      .select('*')
      .in('workout_id', (workouts as BenchmarkWorkout[]).map((w: BenchmarkWorkout) => w.id))
      .order('order_index', { ascending: true })

    if (segError) throw segError

    return (workouts as BenchmarkWorkout[]).map((w: BenchmarkWorkout) => ({
      ...w,
      segments: (segments as BenchmarkSegment[]).filter((s: BenchmarkSegment) => s.workout_id === w.id),
    }))
  },

  async createWorkout(
    userId: string,
    name: string,
    segments: { name: string; metric_label: string }[]
  ): Promise<BenchmarkWorkoutWithSegments> {
    const { data: workout, error } = await db
      .from('benchmark_workouts')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) throw error

    const typedWorkout = workout as BenchmarkWorkout

    if (segments.length > 0) {
      const { data: segs, error: segError } = await db
        .from('benchmark_segments')
        .insert(
          segments.map((s: { name: string; metric_label: string }, i: number) => ({
            workout_id: typedWorkout.id,
            name: s.name,
            metric_label: s.metric_label,
            order_index: i,
          }))
        )
        .select()

      if (segError) throw segError

      return { ...typedWorkout, segments: segs as BenchmarkSegment[] }
    }

    return { ...typedWorkout, segments: [] }
  },

  async deleteWorkout(id: string): Promise<void> {
    const { error } = await db
      .from('benchmark_workouts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
