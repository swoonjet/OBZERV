import { supabase } from '../../lib/supabase'
import { Observation } from '../types/observation'

// Map Supabase row → Observation
function rowToObservation(row: {
  id: string
  transcript: string
  tags: string[]
  duration: number | null
  latitude: number | null
  longitude: number | null
  address: string | null
  created_at: string
}): Observation {
  return {
    id: row.id,
    transcript: row.transcript,
    tags: row.tags ?? [],
    duration: row.duration ?? undefined,
    timestamp: new Date(row.created_at).getTime(),
    location:
      row.latitude != null && row.longitude != null
        ? { latitude: row.latitude, longitude: row.longitude, address: row.address ?? undefined }
        : undefined,
  }
}

export const storage = {
  getObservations: async (): Promise<Observation[]> => {
    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching observations:', error)
      return []
    }
    return (data ?? []).map(rowToObservation)
  },

  saveObservation: async (observation: Observation): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase.from('observations').insert({
      id: observation.id,
      user_id: user.id,
      transcript: observation.transcript,
      tags: observation.tags,
      duration: observation.duration ?? null,
      latitude: observation.location?.latitude ?? null,
      longitude: observation.location?.longitude ?? null,
      address: observation.location?.address ?? null,
    })

    if (error) {
      console.error('Error saving observation:', error)
      throw error
    }
  },

  updateObservation: async (id: string, updates: Partial<Observation>): Promise<void> => {
    const { error } = await supabase
      .from('observations')
      .update({
        transcript: updates.transcript,
        tags: updates.tags,
        duration: updates.duration ?? null,
        latitude: updates.location?.latitude ?? null,
        longitude: updates.location?.longitude ?? null,
        address: updates.location?.address ?? null,
      })
      .eq('id', id)

    if (error) console.error('Error updating observation:', error)
  },

  deleteObservation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', id)

    if (error) console.error('Error deleting observation:', error)
  },
}
