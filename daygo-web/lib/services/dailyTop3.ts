import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})

export interface DailyTop3Item {
  text: string
}

const DEFAULT_ITEMS: DailyTop3Item[] = [{ text: '' }, { text: '' }, { text: '' }]

export const dailyTop3Service = {
  async getItems(userId: string, date: string): Promise<DailyTop3Item[]> {
    const { data, error } = await client
      .from('daily_top3')
      .select('items')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return (data?.items as DailyTop3Item[]) ?? DEFAULT_ITEMS
  },

  async saveItems(userId: string, date: string, items: DailyTop3Item[]): Promise<void> {
    const { error } = await client
      .from('daily_top3')
      .upsert(
        {
          user_id: userId,
          date,
          items: JSON.parse(JSON.stringify(items)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )

    if (error) throw error
  },
}
