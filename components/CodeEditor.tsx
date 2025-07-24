'use client'

import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'

interface ProjectFile {
  id: string
  name: string
  path: string
  content: string
  language: string
}

interface CodeEditorProps {
  file: ProjectFile | null
  onFileUpdate: (fileId: string, content: string) => void
}

export default function CodeEditor({ file, onFileUpdate }: CodeEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Configure Monaco themes and settings
    monaco.editor.defineTheme('kodex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1f2937',
        'editor.foreground': '#f9fafb',
        'editorLineNumber.foreground': '#6b7280',
        'editor.selectionBackground': '#374151',
        'editor.inactiveSelectionBackground': '#374151',
        'editorCursor.foreground': '#3b82f6',
      }
    })
    
    monaco.editor.setTheme('kodex-dark')
  }

  const handleEditorChange = (value: string | undefined) => {
    if (file && value !== undefined) {
      onFileUpdate(file.id, value)
    }
  }

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx':
        return 'typescript'
      case 'jsx':
        return 'javascript'
      case 'ts':
        return 'typescript'
      case 'js':
        return 'javascript'
      case 'css':
        return 'css'
      case 'scss':
        return 'scss'
      case 'html':
        return 'html'
      case 'json':
        return 'json'
      default:
        return 'plaintext'
    }
  }

  if (!file) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-lg">Select a file to start editing</p>
          <p className="text-sm mt-2">Choose a file from the explorer or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* File Tab */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">{file.name}</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.name)}
          value={file.content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            mouseWheelZoom: true,
            contextmenu: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            disableLayerHinting: true,
            fixedOverflowWidgets: true,
            renderValidationDecorations: 'on',
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
            }
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Line 1, Column 1</span>
            <span>{getLanguage(file.name)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>UTF-8</span>
            <span>LF</span>
          </div>
        </div>
      </div>
    </div>
  )
}