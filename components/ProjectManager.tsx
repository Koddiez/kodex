'use client'

import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  description: string
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla'
  template: string
  createdAt: Date
  updatedAt: Date
  deploymentUrl?: string
  status: 'active' | 'deployed' | 'archived'
}

interface ProjectManagerProps {
  onProjectSelect: (project: Project) => void
  currentProject: Project | null
}

export default function ProjectManager({ onProjectSelect, currentProject }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })
      
      if (response.ok) {
        const newProject = await response.json()
        setProjects(prev => [...prev, newProject])
        onProjectSelect(newProject)
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        if (currentProject?.id === projectId) {
          onProjectSelect(projects[0] || null)
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'react': return '⚛️'
      case 'nextjs': return '▲'
      case 'vue': return '💚'
      case 'vanilla': return '🍦'
      default: return '📄'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500'
      case 'deployed': return 'bg-green-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 text-sm mt-2">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Projects</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-400 mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  currentProject?.id === project.id
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-gray-800 hover:bg-gray-750'
                }`}
                onClick={() => onProjectSelect(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getFrameworkIcon(project.framework)}</span>
                      <h3 className="text-white font-medium">{project.name}</h3>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`}></div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{project.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{project.framework}</span>
                      <span>•</span>
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {project.deploymentUrl && (
                      <a
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createProject}
        />
      )}
    </div>
  )
}

interface CreateProjectModalProps {
  onClose: () => void
  onCreate: (project: Partial<Project>) => void
}

function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    framework: 'react' as const,
    template: 'blank'
  })

  const templates = [
    { id: 'blank', name: 'Blank Project', description: 'Start from scratch' },
    { id: 'dashboard', name: 'Dashboard', description: 'Admin dashboard template' },
    { id: 'landing', name: 'Landing Page', description: 'Marketing landing page' },
    { id: 'ecommerce', name: 'E-commerce', description: 'Online store template' },
    { id: 'blog', name: 'Blog', description: 'Content management system' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Create New Project</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of your project"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Framework</label>
            <select
              value={formData.framework}
              onChange={(e) => setFormData(prev => ({ ...prev, framework: e.target.value as any }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="react">React</option>
              <option value="nextjs">Next.js</option>
              <option value="vue">Vue.js</option>
              <option value="vanilla">Vanilla JS</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Template</label>
            <div className="space-y-2">
              {templates.map((template) => (
                <label key={template.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={formData.template === template.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                    className="text-blue-500"
                  />
                  <div>
                    <p className="text-white text-sm">{template.name}</p>
                    <p className="text-gray-400 text-xs">{template.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}