import { supabase } from '../supabase'

export interface MealInspiration {
  id: string
  user_id: string
  date: string
  meal_type: 'lunch' | 'dinner'
  title: string | null
  notes: string | null
  meal_image_url: string | null
  ingredients_image_url: string | null
  created_at: string
}

export const mealInspirationsService = {
  async getByDate(userId: string, date: string): Promise<MealInspiration[]> {
    const { data, error } = await supabase
      .from('meal_inspirations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async create(userId: string, date: string, fields: { meal_type?: 'lunch' | 'dinner'; title?: string | null; notes?: string | null; meal_image_url?: string | null }): Promise<MealInspiration> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('meal_inspirations') as any)
      .insert({ user_id: userId, date, meal_type: 'lunch', ...fields })
      .select()
      .single()

    if (error) throw error
    return data as MealInspiration
  },

  async update(
    id: string,
    userId: string,
    updates: {
      title?: string | null
      notes?: string | null
      meal_image_url?: string | null
      ingredients_image_url?: string | null
    }
  ): Promise<MealInspiration> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('meal_inspirations') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as MealInspiration
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('meal_inspirations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  async uploadImage(userId: string, file: File): Promise<string> {
    let fileExt = file.name.split('.').pop()
    if (!fileExt || fileExt === file.name) {
      const mimeToExt: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
      }
      fileExt = mimeToExt[file.type] || 'png'
    }

    const filePath = `meals/${userId}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('food-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('food-images')
      .getPublicUrl(filePath)

    return publicUrl
  },
}
