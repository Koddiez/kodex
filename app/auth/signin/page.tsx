'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

const Mail = () => <span>📧</span>
const Lock = () => <span>🔒</span>
const Code = () => <span>💻</span>

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Code className="w-12 h-12 text-primary-500" />
          </div>
          <h2 className="text-3xl font-bold gradient-text">Welcome to Kodex</h2>
          <p className="mt-2 text-dark-300">Sign in to your account</p>
        </div>

        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-200 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field pl-10 w-full"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-field pl-10 w-full"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="bg-primary-500/10 border border-primary-500/20 text-primary-400 px-4 py-3 rounded-lg">
              <p className="text-sm font-medium">Demo Account:</p>
              <p className="text-xs">Email: demo@kodex.dev</p>
              <p className="text-xs">Password: demo1234</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-primary-500 hover:text-primary-400 transition-colors">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}