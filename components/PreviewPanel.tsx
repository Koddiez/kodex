'use client'

import { useState, useEffect, useRef } from 'react'

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

interface PreviewPanelProps {
  project: Project | null
  activeFile: ProjectFile | null
}

export default function PreviewPanel({ project, activeFile }: PreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (project) {
      generatePreview()
    }
  }, [project, activeFile])

  const generatePreview = async () => {
    if (!project) return
    
    setIsRefreshing(true)
    try {
      // Generate preview HTML
      const htmlContent = generateHTMLPreview(project)
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (error) {
      console.error('Preview generation failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const generateHTMLPreview = (project: Project): string => {
    const appFile = project.files.find(f => f.name === 'App.tsx' || f.name === 'App.jsx')
    const cssFile = project.files.find(f => f.name.endsWith('.css'))
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kodex Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${cssFile?.content || ''}
        body { margin: 0; padding: 0; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${appFile?.content || `
        function App() {
          return React.createElement('div', {
            className: 'min-h-screen bg-gray-100 flex items-center justify-center'
          }, React.createElement('h1', {
            className: 'text-2xl font-bold text-gray-800'
          }, 'Preview Loading...'));
        }
        `}
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>`
  }

  const getPreviewDimensions = () => {
    switch (previewMode) {
      case 'mobile':
        return { width: '375px', height: '667px' }
      case 'tablet':
        return { width: '768px', height: '1024px' }
      default:
        return { width: '100%', height: '100%' }
    }
  }

  const refreshPreview = () => {
    generatePreview()
  }

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Preview Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Preview</h3>
          <div className="flex items-center space-x-2">
            {/* Device Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    previewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'desktop' && '🖥️'}
                  {mode === 'tablet' && '📱'}
                  {mode === 'mobile' && '📱'}
                </button>
              ))}
            </div>
            
            {/* Actions */}
            <button
              onClick={refreshPreview}
              disabled={isRefreshing}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              title="Refresh Preview"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={openInNewTab}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="Open in New Tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 bg-gray-100">
        <div className="h-full flex items-center justify-center">
          {previewUrl ? (
            <div 
              className="bg-white rounded-lg shadow-lg overflow-hidden"
              style={getPreviewDimensions()}
            >
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">👁️</div>
              <p className="text-lg">Preview will appear here</p>
              <p className="text-sm mt-2">Make changes to see live updates</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {previewMode.charAt(0).toUpperCase() + previewMode.slice(1)} View
          </span>
          <span>
            {project?.framework || 'React'} • Live Preview
          </span>
        </div>
      </div>
    </div>
  )
}