import { supabase } from '../supabase'

export interface MealLibraryItem {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  created_at: string
}

export const mealLibraryService = {
  async getAll(userId: string): Promise<MealLibraryItem[]> {
    const { data, error } = await supabase
      .from('meal_library')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as MealLibraryItem[]
  },

  async create(userId: string, fields: { title: string; description?: string | null; image_url?: string | null }): Promise<MealLibraryItem> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('meal_library') as any)
      .insert({ user_id: userId, ...fields })
      .select()
      .single()

    if (error) throw error
    return data as MealLibraryItem
  },

  async update(id: string, userId: string, fields: { title?: string; description?: string | null; image_url?: string | null }): Promise<MealLibraryItem> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('meal_library') as any)
      .update(fields)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as MealLibraryItem
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('meal_library')
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

    const filePath = `meals/${userId}/library/${Date.now()}.${fileExt}`

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
