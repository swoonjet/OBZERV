import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface FeedObservation {
  id: string
  transcript: string
  tags: string[]
  created_at: string
  address: string | null
}

type FeedState = 'loading' | 'done' | 'error' | 'empty' | 'no-user'

export function FeedView() {
  const [params] = useSearchParams()
  const userId = params.get('u')

  const [state, setState] = useState<FeedState>('loading')
  const [items, setItems] = useState<FeedObservation[]>([])

  useEffect(() => {
    if (!userId) {
      setState('no-user')
      return
    }

    fetch(
      `${SUPABASE_URL}/functions/v1/public-feed?user=${encodeURIComponent(userId)}`,
      {
        headers: {
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        const obs: FeedObservation[] = data.observations ?? []
        setItems(obs)
        setState(obs.length === 0 ? 'empty' : 'done')
      })
      .catch(() => setState('error'))
  }, [userId])

  return (
    <div className="min-h-screen bg-[#faf9f7] px-5 pt-10 pb-16 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="text-xs font-medium tracking-[0.25em] text-gray-400 uppercase mb-1">
          OBZERV
        </p>
        <h1 className="text-2xl font-light text-gray-900">Observations</h1>
        <div className="mt-3 h-px bg-gray-200" />
      </motion.div>

      {/* States */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        </div>
      )}

      {state === 'no-user' && (
        <p className="text-gray-500 text-center py-24">Invalid feed link.</p>
      )}

      {state === 'error' && (
        <p className="text-gray-500 text-center py-24">
          Couldn't load this feed. Try again later.
        </p>
      )}

      {state === 'empty' && (
        <p className="text-gray-400 text-center py-24 italic">
          No observations yet.
        </p>
      )}

      {/* Observation list */}
      {state === 'done' && (
        <div className="space-y-6">
          {items.map((obs, i) => (
            <motion.div
              key={obs.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
            >
              <p className="text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
                {obs.transcript}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                <span>{format(new Date(obs.created_at), 'MMM d, yyyy · h:mm a')}</span>

                {obs.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {obs.address}
                  </span>
                )}
              </div>

              {obs.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {obs.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-500"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          <p className="text-center text-xs text-gray-300 pt-6 tracking-widest uppercase">
            OBZERV · voice journaling
          </p>
        </div>
      )}
    </div>
  )
}
