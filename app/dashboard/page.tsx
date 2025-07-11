"use client"

import { useState } from 'react'
import Editor from '../../components/Editor'
import { Plus, Folder, FileText, Save, Play, Users } from 'lucide-react'
import AIChat from '../../components/AIChat'
import { signOut, useSession } from 'next-auth/react'
import ProjectsList from './ProjectsList'

const initialFiles = [
  { name: 'index.tsx', language: 'typescript', content: '// Start coding with Kodex!\n' },
  { name: 'styles.css', language: 'css', content: 'body {\n  background: #0f172a;\n}' },
]

export default function DashboardPage() {
  const [files, setFiles] = useState(initialFiles)
  const [activeFile, setActiveFile] = useState(0)
  const [currentProject, setCurrentProject] = useState<any>(null)
  const { data: session } = useSession()

  const handleEditorChange = (value: string | undefined) => {
    setFiles((prev) => {
      const updated = [...prev]
      updated[activeFile] = { ...updated[activeFile], content: value || '' }
      return updated
    })
  }

  const addFile = () => {
    setFiles((prev) => [
      ...prev,
      { name: `untitled-${prev.length + 1}.js`, language: 'javascript', content: '' }
    ])
    setActiveFile(files.length)
  }

  const handleOpenProject = (project: any) => {
    setCurrentProject(project)
    setFiles(project.files.length ? project.files : initialFiles)
    setActiveFile(0)
  }

  const handleSave = async () => {
    if (!currentProject) return
    await fetch(`/api/projects/${currentProject._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentProject.name, files }),
    })
  }

  const handleInsertCode = (code: string, language: string) => {
    const newFile = {
      name: `generated-${Date.now()}.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'jsx'}`,
      language,
      content: code
    }
    setFiles([...files, newFile])
    setActiveFile(files.length)
  }

  const handleDeploy = async () => {
    if (!currentProject) return
    
    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: currentProject._id, 
          projectName: currentProject.name,
          files: files
        }),
      })
      
      const deployment = await response.json()
      
      if (deployment.url) {
        window.open(deployment.url, '_blank')
      }
    } catch (error) {
      console.error('Deployment failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-dark-700 bg-dark-800">
        <div className="flex items-center gap-3">
          <Folder className="w-6 h-6 text-primary-500" />
          <span className="text-2xl font-bold gradient-text">Kodex Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <span className="text-dark-300 text-sm">{session.user.email}</span>
          )}
          <button className="btn-secondary flex items-center gap-2" onClick={addFile}>
            <Plus className="w-4 h-4" /> New File
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={handleDeploy}>
            <Play className="w-4 h-4" /> Deploy
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Users className="w-4 h-4" /> Share
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => signOut()}>Sign Out</button>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-800 border-r border-dark-700 p-4 flex flex-col gap-4">
          <h3 className="text-lg font-semibold mb-2">Projects</h3>
          <ProjectsList onOpen={handleOpenProject} />
          <h3 className="text-lg font-semibold mt-8 mb-2">Files</h3>
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li key={file.name}>
                <button
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    idx === activeFile ? 'bg-primary-600 text-white' : 'hover:bg-dark-700 text-dark-200'
                  }`}
                  onClick={() => setActiveFile(idx)}
                >
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{file.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        {/* Editor + AI Chat */}
        <section className="flex-1 p-8 overflow-auto flex gap-8">
          <div className="flex-1">
            <Editor
              value={files[activeFile].content}
              language={files[activeFile].language}
              onChange={handleEditorChange}
              projectId={currentProject?._id}
              fileIndex={activeFile}
            />
          </div>
          <div className="hidden xl:block w-[380px] flex-shrink-0">
            <AIChat 
              onInsertCode={handleInsertCode}
              currentLanguage={files[activeFile]?.language}
            />
          </div>
        </section>
      </main>
    </div>
  )
} 