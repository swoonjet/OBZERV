import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import obzervLogo from '../../assets/logo.svg'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function SubscribePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const handle = params.get('h') ?? ''

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  const handleFollow = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoggedIn(false); setLoading(false); return }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ handle }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setDone(true)
      setTimeout(() => navigate('/stream'), 1800)
    } else {
      toast.error(data.error ?? 'Could not follow')
    }
  }

  if (!handle) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-6 text-center">
        <p className="text-gray-400">Invalid invite link.</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh px-6 bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <img src={obzervLogo} alt="OBZERV" className="w-16 h-16 mx-auto mb-6 opacity-80" />

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-xl font-light text-gray-900">Following @{handle}</p>
            <p className="text-sm text-gray-400 mt-2">Opening your stream…</p>
          </motion.div>
        ) : (
          <>
            <p className="text-xs tracking-widest uppercase text-gray-400 mb-2">Invite</p>
            <h1 className="text-2xl font-light text-gray-900 mb-1">
              Follow <span className="font-normal">@{handle}</span>
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Their observations will appear in your OBZERV stream. Location is never shared.
            </p>

            {loggedIn === null && (
              <div className="flex justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
              </div>
            )}

            {loggedIn === true && (
              <button
                onClick={handleFollow}
                disabled={loading}
                className="w-full py-3.5 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Follow @{handle}
              </button>
            )}

            {loggedIn === false && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  You need an OBZERV account to follow someone.
                </p>
                <button
                  onClick={() => navigate(`/?follow=${handle}`)}
                  className="w-full py-3.5 bg-black text-white rounded-xl text-sm font-medium"
                >
                  Sign in to follow
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
