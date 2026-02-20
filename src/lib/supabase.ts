import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      observations: {
        Row: {
          id: string
          user_id: string
          transcript: string
          tags: string[]
          duration: number | null
          latitude: number | null
          longitude: number | null
          address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['observations']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['observations']['Insert']>
      }
    }
  }
}
