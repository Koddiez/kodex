// Kodex: Sign-in page module fix
"use client";

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Github, LucideGoogle } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="card w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center gradient-text">Sign in to Kodex</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-dark-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-dark-400" />
              <input
                type="email"
                className="input-field pl-10 w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-dark-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-dark-400" />
              <input
                type="password"
                className="input-field pl-10 w-full"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign In'}
          </button>
        </form>
        <div className="my-6 flex items-center gap-2">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-dark-400 text-xs">or</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn-secondary flex items-center gap-2 justify-center" disabled>
            <LucideGoogle className="w-5 h-5" /> Sign in with Google (coming soon)
          </button>
          <button className="btn-secondary flex items-center gap-2 justify-center" disabled>
            <Github className="w-5 h-5" /> Sign in with GitHub (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
} 