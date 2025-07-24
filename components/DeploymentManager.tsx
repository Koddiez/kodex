'use client'

import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  files: Array<{
    id: string
    name: string
    content: string
    language: string
  }>
  framework: string
}

interface Deployment {
  id: string
  projectId: string
  url: string
  status: 'building' | 'deployed' | 'failed'
  createdAt: Date
  buildLogs: string[]
}

interface DeploymentManagerProps {
  project: Project | null
  onDeploy: (project: Project) => Promise<void>
}

export default function DeploymentManager({ project, onDeploy }: DeploymentManagerProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'vercel' | 'netlify' | 'github'>('vercel')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (project) {
      fetchDeployments(project.id)
    }
  }, [project])

  const fetchDeployments = async (projectId: string) => {
    try {
      const response = await fetch(`/api/deployments/${projectId}`)
      const data = await response.json()
      setDeployments(data)
    } catch (error) {
      console.error('Failed to fetch deployments:', error)
    }
  }

  const handleDeploy = async () => {
    if (!project) return
    
    setIsDeploying(true)
    try {
      await onDeploy(project)
      // Refresh deployments after successful deploy
      await fetchDeployments(project.id)
    } catch (error) {
      console.error('Deployment failed:', error)
    } finally {
      setIsDeploying(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'vercel': return '▲'
      case 'netlify': return '🌐'
      case 'github': return '🐙'
      default: return '🚀'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'building': return 'text-yellow-400'
      case 'deployed': return 'text-green-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-4">🚀</div>
          <p>Select a project to deploy</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Deployment</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Deployment Settings */}
      {showSettings && (
        <div className="p-4 bg-gray-750 border-b border-gray-700">
          <h4 className="text-white font-medium mb-3">Deployment Provider</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['vercel', 'netlify', 'github'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  selectedProvider === provider
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-lg mb-1">{getProviderIcon(provider)}</div>
                <div className="text-xs font-medium capitalize">{provider}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Deploy Button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
        >
          {isDeploying ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Deploy to {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}</span>
            </>
          )}
        </button>
      </div>

      {/* Deployment History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h4 className="text-white font-medium mb-3">Recent Deployments</h4>
          {deployments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🚀</div>
              <p className="text-gray-400 text-sm">No deployments yet</p>
              <p className="text-gray-500 text-xs mt-1">Deploy your project to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div key={deployment.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        deployment.status === 'building' ? 'bg-yellow-400 animate-pulse' :
                        deployment.status === 'deployed' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${getStatusColor(deployment.status)}`}>
                        {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {deployment.url && (
                    <div className="mb-2">
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <span>{deployment.url}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {deployment.buildLogs.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        Build Logs ({deployment.buildLogs.length} entries)
                      </summary>
                      <div className="mt-2 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                        {deployment.buildLogs.map((log, index) => (
                          <div key={index} className="text-xs text-gray-300 font-mono">
                            {log}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button className="px-3 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors">
            View Analytics
          </button>
          <button className="px-3 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors">
            Custom Domain
          </button>
        </div>
      </div>
    </div>
  )
}