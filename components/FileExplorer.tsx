'use client'

import { useState } from 'react'

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

interface FileExplorerProps {
  project: Project | null
  activeFile: ProjectFile | null
  onFileSelect: (file: ProjectFile) => void
}

export default function FileExplorer({ project, activeFile, onFileSelect }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']))

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return '⚛️'
      case 'ts':
      case 'js':
        return '📄'
      case 'css':
      case 'scss':
        return '🎨'
      case 'html':
        return '🌐'
      case 'json':
        return '📋'
      default:
        return '📄'
    }
  }

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName)
    } else {
      newExpanded.add(folderName)
    }
    setExpandedFolders(newExpanded)
  }

  if (!project) {
    return (
      <div className="p-4 text-gray-400">
        No project loaded
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium text-sm">Explorer</h3>
          <button className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Project Root */}
          <div className="mb-2">
            <button
              onClick={() => toggleFolder('root')}
              className="flex items-center w-full text-left text-white hover:bg-gray-700 rounded px-2 py-1"
            >
              <span className="mr-1">
                {expandedFolders.has('root') ? '📂' : '📁'}
              </span>
              <span className="text-sm font-medium">{project.name}</span>
            </button>
          </div>

          {/* Source Folder */}
          {expandedFolders.has('root') && (
            <div className="ml-4">
              <button
                onClick={() => toggleFolder('src')}
                className="flex items-center w-full text-left text-gray-300 hover:bg-gray-700 rounded px-2 py-1"
              >
                <span className="mr-1">
                  {expandedFolders.has('src') ? '📂' : '📁'}
                </span>
                <span className="text-sm">src</span>
              </button>

              {/* Files */}
              {expandedFolders.has('src') && (
                <div className="ml-4">
                  {project.files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => onFileSelect(file)}
                      className={`flex items-center w-full text-left px-2 py-1 rounded text-sm ${
                        activeFile?.id === file.id
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-2">{getFileIcon(file.name)}</span>
                      <span>{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {project.files.length} files • {project.framework}
        </div>
      </div>
    </div>
  )
}