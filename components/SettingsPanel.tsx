'use client'

import { useState, useEffect } from 'react'

interface UserSettings {
  theme: 'dark' | 'light' | 'auto'
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  autoSave: boolean
  aiProvider: 'openai' | 'moonshot' | 'both'
  defaultFramework: 'react' | 'nextjs' | 'vue' | 'vanilla'
  notifications: boolean
}

interface SettingsPanelProps {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    autoSave: true,
    aiProvider: 'openai',
    defaultFramework: 'react',
    notifications: true
  })
  
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'general'>('editor')

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('kodex-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('kodex-settings', JSON.stringify(newSettings))
  }

  const resetSettings = () => {
    const defaultSettings: UserSettings = {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
      autoSave: true,
      aiProvider: 'openai',
      defaultFramework: 'react',
      notifications: true
    }
    setSettings(defaultSettings)
    localStorage.setItem('kodex-settings', JSON.stringify(defaultSettings))
  }

  const tabs = [
    { id: 'editor', name: 'Editor', icon: '📝' },
    { id: 'ai', name: 'AI Settings', icon: '🤖' },
    { id: 'general', name: 'General', icon: '⚙️' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] border border-gray-700 flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 rounded-l-lg p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold text-lg">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-700">
            <button
              onClick={resetSettings}
              className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Editor Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value as any)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Font Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-gray-400 text-sm mt-1">{settings.fontSize}px</div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Tab Size</label>
                  <select
                    value={settings.tabSize}
                    onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                    <option value={8}>8 spaces</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wordWrap}
                      onChange={(e) => updateSetting('wordWrap', e.target.checked)}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-white">Word Wrap</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.minimap}
                      onChange={(e) => updateSetting('minimap', e.target.checked)}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-white">Show Minimap</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => updateSetting('autoSave', e.target.checked)}
                      className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-white">Auto Save</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">AI Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">AI Provider</label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) => updateSetting('aiProvider', e.target.value as any)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="openai">OpenAI GPT-4</option>
                    <option value="moonshot">Moonshot AI</option>
                    <option value="both">Both (Fallback)</option>
                  </select>
                  <p className="text-gray-400 text-sm mt-1">
                    Choose your preferred AI provider for code generation
                  </p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Default Framework</label>
                  <select
                    value={settings.defaultFramework}
                    onChange={(e) => updateSetting('defaultFramework', e.target.value as any)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="react">React</option>
                    <option value="nextjs">Next.js</option>
                    <option value="vue">Vue.js</option>
                    <option value="vanilla">Vanilla JS</option>
                  </select>
                  <p className="text-gray-400 text-sm mt-1">
                    Default framework for new projects and AI generation
                  </p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">AI Usage Tips</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Be specific in your prompts for better results</li>
                  <li>• Include context about your project when asking for features</li>
                  <li>• Use the different generation types (component, page, feature)</li>
                  <li>• Review and modify generated code as needed</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">General Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => updateSetting('notifications', e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white">Enable Notifications</span>
                </label>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">About Kodex</h4>
                <div className="text-gray-300 text-sm space-y-2">
                  <p>Version: 1.0.0</p>
                  <p>AI-powered coding platform combining the best of bolt.new, V0.dev, and Lovable.so</p>
                  <p>Built with Next.js, TypeScript, and Tailwind CSS</p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Keyboard Shortcuts</h4>
                <div className="text-gray-300 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Save Project</span>
                    <span className="text-gray-400">Ctrl+S</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle AI Assistant</span>
                    <span className="text-gray-400">Ctrl+Shift+A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New File</span>
                    <span className="text-gray-400">Ctrl+N</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quick Deploy</span>
                    <span className="text-gray-400">Ctrl+D</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}