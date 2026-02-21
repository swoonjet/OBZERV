import { useState } from 'react'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface Props {
  userId: string
  onDone: (handle: string) => void
}

export function SetupProfile({ userId, onDone }: Props) {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const clean = handle.toLowerCase().replace(/[^a-z0-9_]/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (clean.length < 3) return toast.error('Handle must be at least 3 characters')
    setLoading(true)

    const { error } = await supabase.from('profiles').insert({ id: userId, handle: clean })

    if (error) {
      if (error.code === '23505') {
        toast.error('That handle is taken — try another')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    toast.success(`You're @${clean}`)
    onDone(clean)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <p className="text-xs tracking-widest uppercase text-gray-400 mb-2">One last thing</p>
          <h2 className="text-2xl font-light text-gray-900">Choose a handle</h2>
          <p className="text-sm text-gray-500 mt-2">
            Others use this to find and follow you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
            <input
              type="text"
              value={clean}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="yourhandle"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full pl-8 pr-4 py-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <p className="text-xs text-gray-400">3–20 characters, letters, numbers and underscores only</p>

          <button
            type="submit"
            disabled={loading || clean.length < 3}
            className="w-full py-3 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Set handle
          </button>
        </form>
      </motion.div>
    </div>
  )
}
