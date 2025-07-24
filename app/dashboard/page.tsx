'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import KodexIDE from '@/components/KodexIDE'
import SettingsPanel from '@/components/SettingsPanel'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMode, setCurrentMode] = useState<'developer' | 'designer' | 'product'>('developer')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading Kodex...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-white font-semibold">Kodex</span>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              {(['developer', 'designer', 'product'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCurrentMode(mode)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    currentMode === mode
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">Welcome, {session.user?.email}</span>
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => signOut()}
              className="text-gray-300 hover:text-white text-sm px-3 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main IDE Interface */}
      <KodexIDE mode={currentMode} />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}