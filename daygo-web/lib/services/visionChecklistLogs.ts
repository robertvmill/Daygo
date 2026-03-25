import { supabase } from '../supabase'

export interface VisionChecklistLog {
  id: string
  user_id: string
  pillar_index: number
  item_index: number
  date: string
  completed: boolean
  value: number | null
  created_at: string
}

export interface ChecklistState {
  completed: boolean
  value: number | null
}

export const visionChecklistLogsService = {
  async getLogsForDate(userId: string, date: string): Promise<Record<string, ChecklistState>> {
    const { data, error } = await (supabase
      .from('vision_checklist_logs') as any)
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)

    if (error) throw error

    const map: Record<string, ChecklistState> = {}
    for (const log of (data ?? []) as VisionChecklistLog[]) {
      map[`hv-${log.pillar_index}-${log.item_index}`] = {
        completed: log.completed,
        value: log.value,
      }
    }
    return map
  },

  async toggleItem(
    userId: string,
    pillarIndex: number,
    itemIndex: number,
    date: string,
    completed: boolean
  ): Promise<void> {
    const { error } = await (supabase
      .from('vision_checklist_logs') as any)
      .upsert(
        {
          user_id: userId,
          pillar_index: pillarIndex,
          item_index: itemIndex,
          date,
          completed,
        },
        { onConflict: 'user_id,pillar_index,item_index,date' }
      )

    if (error) throw error
  },

  async logMetric(
    userId: string,
    pillarIndex: number,
    itemIndex: number,
    date: string,
    value: number,
    target: number
  ): Promise<void> {
    const { error } = await (supabase
      .from('vision_checklist_logs') as any)
      .upsert(
        {
          user_id: userId,
          pillar_index: pillarIndex,
          item_index: itemIndex,
          date,
          value,
          completed: value >= target,
        },
        { onConflict: 'user_id,pillar_index,item_index,date' }
      )

    if (error) throw error
  },

  async getLogsForRange(userId: string, startDate: string, endDate: string): Promise<VisionChecklistLog[]> {
    const { data, error } = await (supabase
      .from('vision_checklist_logs') as any)
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error
    return (data ?? []) as VisionChecklistLog[]
  },
}
