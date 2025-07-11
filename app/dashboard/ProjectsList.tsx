"use client"

import { useEffect, useState } from 'react'
import { FolderPlus, Trash2, Loader2, FileText } from 'lucide-react'

export default function ProjectsList({ onOpen }: { onOpen: (project: any) => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const project = await res.json()
    setProjects([project, ...projects])
    setNewName('')
    setCreating(false)
  }

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(projects.filter(p => p._id !== id))
  }

  if (loading) return <div className="flex items-center gap-2 text-dark-300"><Loader2 className="animate-spin w-5 h-5" /> Loading projects...</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input
          className="input-field flex-1"
          placeholder="New project name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createProject()}
        />
        <button className="btn-primary flex items-center gap-1" onClick={createProject} disabled={creating}>
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-2">
        {projects.map(project => (
          <li key={project._id} className="flex items-center gap-2">
            <button
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-700 text-dark-200 transition-colors"
              onClick={() => onOpen(project)}
            >
              <FileText className="w-4 h-4" />
              <span className="truncate">{project.name}</span>
            </button>
            <button className="text-red-500 hover:text-red-700" onClick={() => deleteProject(project._id)}>
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
} 