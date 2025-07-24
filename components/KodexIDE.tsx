'use client'

import { useState, useEffect } from 'react'
import FileExplorer from './FileExplorer'
import CodeEditor from './CodeEditor'
import PreviewPanel from './PreviewPanel'
import AIAssistant from './AIAssistant'
import PromptToProduct from './PromptToProduct'
import DesignToReact from './DesignToReact'
import ProjectManager from './ProjectManager'
import DeploymentManager from './DeploymentManager'
import { usePerformanceTracking } from './PerformanceDashboard'

interface KodexIDEProps {
  mode: 'developer' | 'designer' | 'product'
}

interface ProjectFile {
  id: string
  name: string
  path: string
  content: string
  language: string
}

interface Project {
  id: string
  name: string
  files: ProjectFile[]
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla'
}

export default function KodexIDE({ mode }: KodexIDEProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null)
  const [showAI, setShowAI] = useState(true)
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [showDeployment, setShowDeployment] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Performance tracking hook
  const { trackEvent, measureAsyncFunction } = usePerformanceTracking()

  // Initialize with a default project
  useEffect(() => {
    const defaultProject: Project = {
      id: 'default',
      name: 'My App',
      framework: 'react',
      files: [
        {
          id: '1',
          name: 'App.tsx',
          path: '/src/App.tsx',
          content: `import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Kodex
        </h1>
        <p className="text-gray-600">
          Start building with AI assistance
        </p>
      </div>
    </div>
  )
}

export default App`,
          language: 'typescript'
        },
        {
          id: '2',
          name: 'index.css',
          path: '/src/index.css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
          language: 'css'
        }
      ]
    }
    setCurrentProject(defaultProject)
    setActiveFile(defaultProject.files[0])
  }, [])

  const handleFileSelect = (file: ProjectFile) => {
    setActiveFile(file)
  }

  const handleFileUpdate = (fileId: string, content: string) => {
    if (!currentProject) return
    
    const updatedFiles = currentProject.files.map(file =>
      file.id === fileId ? { ...file, content } : file
    )
    
    setCurrentProject({ ...currentProject, files: updatedFiles })
    
    if (activeFile?.id === fileId) {
      setActiveFile({ ...activeFile, content })
    }
  }

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project)
    setActiveFile(project.files[0] || null)
    setShowProjectManager(false)
  }

  const handleSaveProject = async () => {
    if (!currentProject) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProject)
      })
      
      if (response.ok) {
        console.log('Project saved successfully')
      }
    } catch (error) {
      console.error('Failed to save project:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeployProject = async () => {
    if (!currentProject) return
    
    try {
      const response = await fetch(`/api/deployments/${currentProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: currentProject.files,
          provider: 'vercel'
        })
      })
      
      if (response.ok) {
        setShowDeployment(true)
      }
    } catch (error) {
      console.error('Failed to deploy project:', error)
    }
  }

  const handleAIGenerate = async (prompt: string, type: 'component' | 'page' | 'feature') => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type,
          framework: currentProject?.framework || 'react',
          context: currentProject?.files || []
        })
      })
      
      const result = await response.json()
      
      console.log('AI API Response:', result) // Debug log
      
      if (result.files && result.files.length > 0) {
        // Add generated files to project
        const newFiles = result.files.map((file: any, index: number) => ({
          id: `generated-${Date.now()}-${index}`,
          name: file.name,
          path: `/src/${file.name}`,
          content: file.content,
          language: file.language || 'typescript'
        }))
        
        if (currentProject) {
          const updatedProject = {
            ...currentProject,
            files: [...currentProject.files, ...newFiles]
          }
          setCurrentProject(updatedProject)
          
          // Open the first generated file
          if (newFiles.length > 0) {
            setActiveFile(newFiles[0])
          }
        }
      } else if (result.code) {
        // Handle single code response (fallback format)
        const fileName = `generated-${Date.now()}.tsx`
        const newFile: ProjectFile = {
          id: `generated-${Date.now()}`,
          name: fileName,
          path: `/src/${fileName}`,
          content: result.code,
          language: 'typescript'
        }
        
        if (currentProject) {
          const updatedProject = {
            ...currentProject,
            files: [...currentProject.files, newFile]
          }
          setCurrentProject(updatedProject)
          setActiveFile(newFile)
        }
      } else {
        console.error('No code generated:', result)
        throw new Error(result.error || 'No code was generated')
      }
    } catch (error) {
      console.error('AI generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderModeContent = () => {
    switch (mode) {
      case 'product':
        return (
          <PromptToProduct
            onGenerate={handleAIGenerate}
            isGenerating={isGenerating}
          />
        )
      case 'designer':
        return (
          <DesignToReact
            onGenerate={handleAIGenerate}
            isGenerating={isGenerating}
          />
        )
      default:
        return (
          <div className="flex h-full">
            {/* File Explorer */}
            <div className="w-64 bg-gray-800 border-r border-gray-700">
              <FileExplorer
                project={currentProject}
                activeFile={activeFile}
                onFileSelect={handleFileSelect}
              />
            </div>

            {/* Code Editor */}
            <div className="flex-1 flex flex-col">
              <CodeEditor
                file={activeFile}
                onFileUpdate={handleFileUpdate}
              />
            </div>

            {/* Preview Panel */}
            <div className="w-96 bg-white border-l border-gray-300">
              <PreviewPanel
                project={currentProject}
                activeFile={activeFile}
              />
            </div>

            {/* AI Assistant */}
            {showAI && (
              <div className="w-80 bg-gray-800 border-l border-gray-700">
                <AIAssistant
                  onGenerate={handleAIGenerate}
                  isGenerating={isGenerating}
                  project={currentProject}
                />
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowProjectManager(!showProjectManager)}
            className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z" />
            </svg>
            <span className="font-medium">{currentProject?.name || 'Select Project'}</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveProject}
              disabled={isSaving || !currentProject}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {isSaving ? (
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            
            <button
              onClick={handleDeployProject}
              disabled={!currentProject}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Deploy</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {mode === 'developer' && (
            <>
              <button
                onClick={() => setShowDeployment(!showDeployment)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  showDeployment 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Deployments
              </button>
              <button
                onClick={() => setShowAI(!showAI)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  showAI 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                AI Assistant
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {renderModeContent()}
        
        {/* Project Manager Overlay */}
        {showProjectManager && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] border border-gray-700">
              <ProjectManager
                onProjectSelect={handleProjectSelect}
                currentProject={currentProject}
              />
            </div>
          </div>
        )}

        {/* Deployment Manager Overlay */}
        {showDeployment && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] border border-gray-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Deployment Manager</h3>
                <button
                  onClick={() => setShowDeployment(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DeploymentManager
                project={currentProject}
                onDeploy={handleDeployProject}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}