import { supabase } from '@/lib/supabase'
import type { BenchmarkAttempt, BenchmarkAttemptValue, BenchmarkAttemptWithValues } from '@/lib/types/database'

const db = supabase as any

export const benchmarkAttemptsService = {
  async getAttempts(workoutId: string): Promise<BenchmarkAttemptWithValues[]> {
    const { data: attempts, error } = await db
      .from('benchmark_attempts')
      .select('*')
      .eq('workout_id', workoutId)
      .order('attempted_at', { ascending: true })

    if (error) throw error
    if (!attempts || attempts.length === 0) return []

    const { data: values, error: valError } = await db
      .from('benchmark_attempt_values')
      .select('*')
      .in('attempt_id', (attempts as BenchmarkAttempt[]).map((a: BenchmarkAttempt) => a.id))

    if (valError) throw valError

    return (attempts as BenchmarkAttempt[]).map((a: BenchmarkAttempt) => ({
      ...a,
      values: (values as BenchmarkAttemptValue[]).filter((v: BenchmarkAttemptValue) => v.attempt_id === a.id),
    }))
  },

  async createAttempt(
    userId: string,
    workoutId: string,
    attemptedAt: string,
    notes: string | null,
    values: { segment_id: string; value: number }[]
  ): Promise<BenchmarkAttemptWithValues> {
    const { data: attempt, error } = await db
      .from('benchmark_attempts')
      .insert({ user_id: userId, workout_id: workoutId, attempted_at: attemptedAt, notes: notes || null })
      .select()
      .single()

    if (error) throw error

    const typedAttempt = attempt as BenchmarkAttempt

    if (values.length > 0) {
      const { data: vals, error: valError } = await db
        .from('benchmark_attempt_values')
        .insert(
          values.map((v: { segment_id: string; value: number }) => ({
            attempt_id: typedAttempt.id,
            segment_id: v.segment_id,
            value: v.value,
          }))
        )
        .select()

      if (valError) throw valError

      return { ...typedAttempt, values: vals as BenchmarkAttemptValue[] }
    }

    return { ...typedAttempt, values: [] }
  },

  async deleteAttempt(attemptId: string): Promise<void> {
    const { error } = await db
      .from('benchmark_attempts')
      .delete()
      .eq('id', attemptId)

    if (error) throw error
  },
}
