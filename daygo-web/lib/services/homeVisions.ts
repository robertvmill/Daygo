import { supabase } from '../supabase'

export interface HomeVisionPillar {
  label: string
  goal: string
  tagline: string
  color: 'emerald' | 'sky' | 'purple' | 'amber' | 'rose'
  items: string[]
}

export interface HomeVision {
  id: string
  user_id: string
  title: string
  subtitle: string | null
  pillars: HomeVisionPillar[]
  rule_title: string | null
  rule_text: string | null
  created_at: string
  updated_at: string
}

export const homeVisionsService = {
  async getHomeVision(userId: string): Promise<HomeVision | null> {
    const { data, error } = await supabase
      .from('home_visions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') return null // no rows
    if (error) throw error
    return data as HomeVision
  },

  async upsertHomeVision(
    userId: string,
    vision: {
      title: string
      subtitle?: string | null
      pillars: HomeVisionPillar[]
      rule_title?: string | null
      rule_text?: string | null
    }
  ): Promise<HomeVision> {
    const { data, error } = await (supabase
      .from('home_visions') as any)
      .upsert(
        {
          user_id: userId,
          title: vision.title,
          subtitle: vision.subtitle ?? null,
          pillars: JSON.stringify(vision.pillars),
          rule_title: vision.rule_title ?? null,
          rule_text: vision.rule_text ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data as HomeVision
  },

  async deleteHomeVision(userId: string): Promise<void> {
    const { error } = await (supabase
      .from('home_visions') as any)
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  },
}
