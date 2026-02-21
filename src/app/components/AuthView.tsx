import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import obzervLogo from '../../assets/logo.svg'
import { TruchetBackground } from './TruchetBackground'

export function AuthView() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else if (mode === 'signup') {
      toast.success('Account created! Check your email to confirm.')
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh px-6 bg-white">
      <TruchetBackground />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <img src={obzervLogo} alt="OBZERV" className="w-28 h-28 mx-auto mb-3" />
          <h1 className="text-2xl font-light tracking-widest uppercase">OBZERV</h1>
          <p className="text-sm text-gray-500 mt-1">Notice. Record. Reflect.</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${
              mode === 'signin' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${
              mode === 'signup' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </motion.form>
        </AnimatePresence>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-black underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
