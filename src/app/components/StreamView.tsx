import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { Rss, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface StreamItem {
  id: string
  transcript: string
  tags: string[]
  created_at: string
  handle: string
}

type State = 'loading' | 'empty' | 'done' | 'error'

export function StreamView() {
  const [state, setState] = useState<State>('loading')
  const [items, setItems] = useState<StreamItem[]>([])
  const [unsubHandle, setUnsubHandle] = useState<string | null>(null)

  const load = async () => {
    setState('loading')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return setState('error')

    const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribed-feed`, {
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
    })
    const data = await res.json()
    if (!res.ok) { setState('error'); return }
    const list: StreamItem[] = data.items ?? []
    setItems(list)
    setState(list.length === 0 ? 'empty' : 'done')
  }

  useEffect(() => { load() }, [])

  const handleUnsubscribe = async (handle: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ handle }),
    })
    if (res.ok) {
      toast.success(`Unfollowed @${handle}`)
      setUnsubHandle(null)
      load()
    } else {
      toast.error('Could not unfollow')
    }
  }

  return (
    <div className="flex-1 flex flex-col" style={{ paddingBottom: 'var(--content-pb)' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Rss className="w-4 h-4 text-gray-400" />
          <p className="text-xs tracking-widest uppercase text-gray-400">Stream</p>
        </div>
        <h1 className="text-2xl font-light text-gray-900">Following</h1>
        <div className="mt-3 h-px bg-gray-100" />
      </div>

      {/* States */}
      {state === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-gray-400 text-sm">Couldn't load stream. Pull to retry.</p>
        </div>
      )}

      {state === 'empty' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <UserPlus className="w-10 h-10 text-gray-200" />
          <div>
            <p className="text-gray-600 font-light mb-1">You're not following anyone yet</p>
            <p className="text-sm text-gray-400">
              Share your invite link from the Observations tab to connect with others.
            </p>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="overflow-y-auto px-5 space-y-4 pt-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
            >
              {/* Handle badge */}
              <button
                onClick={() => setUnsubHandle(unsubHandle === item.handle ? null : item.handle)}
                className="text-xs font-medium text-gray-400 mb-2 hover:text-gray-600 transition-colors"
              >
                @{item.handle}
              </button>

              {/* Unsubscribe prompt */}
              {unsubHandle === item.handle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-2 flex items-center gap-3"
                >
                  <p className="text-xs text-gray-500">Unfollow @{item.handle}?</p>
                  <button
                    onClick={() => handleUnsubscribe(item.handle)}
                    className="text-xs text-red-500 font-medium hover:underline"
                  >
                    Unfollow
                  </button>
                  <button
                    onClick={() => setUnsubHandle(null)}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}

              <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap mb-2">
                {item.transcript}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                <span>{format(new Date(item.created_at), 'MMM d · h:mm a')}</span>
              </div>

              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          <p className="text-center text-xs text-gray-300 py-4 tracking-widest uppercase">
            Showing last 40 observations
          </p>
        </div>
      )}
    </div>
  )
}
