import { supabase } from '@/lib/supabase'
import type { DailyNote } from '@/lib/types/database'

export const dailyNotesService = {
  async getNote(userId: string, date: string): Promise<DailyNote | null> {
    const { data, error } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async saveNote(userId: string, date: string, note: string): Promise<DailyNote> {
    const { data, error } = await supabase
      .from('daily_notes')
      .upsert(
        {
          user_id: userId,
          date: date,
          note: note,
          updated_at: new Date().toISOString(),
        } as any,
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (error) throw error
    return data as DailyNote
  },

  async saveBigWins(userId: string, date: string, bigWins: string[]): Promise<DailyNote> {
    const { data, error } = await supabase
      .from('daily_notes')
      .upsert(
        {
          user_id: userId,
          date: date,
          big_wins: bigWins,
          updated_at: new Date().toISOString(),
        } as any,
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (error) throw error
    return data as DailyNote
  },
}
