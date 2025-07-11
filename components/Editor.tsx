"use client"

import { useRef, useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { io, Socket } from 'socket.io-client'

interface EditorProps {
  value: string
  language: string
  onChange: (value: string | undefined) => void
  theme?: string
  projectId?: string
  fileIndex?: number
}

export default function Editor({ value, language, onChange, theme = 'vs-dark', projectId, fileIndex }: EditorProps) {
  const editorRef = useRef<any>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!projectId) return

    // Connect to Socket.io
    socketRef.current = io('/api/collaboration', {
      path: '/api/collaboration',
    })

    socketRef.current.on('connect', () => {
      setIsConnected(true)
      socketRef.current?.emit('join-project', projectId)
    })

    socketRef.current.on('disconnect', () => {
      setIsConnected(false)
    })

    socketRef.current.on('code-update', (data: { fileIndex: number; content: string; userId: string }) => {
      if (data.fileIndex === fileIndex && data.userId !== socketRef.current?.id) {
        onChange(data.content)
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-project', projectId)
        socketRef.current.disconnect()
      }
    }
  }, [projectId, fileIndex, onChange])

  const handleEditorChange = (value: string | undefined) => {
    onChange(value)
    
    // Emit change to other collaborators
    if (socketRef.current && projectId && fileIndex !== undefined) {
      socketRef.current.emit('code-change', {
        projectId,
        fileIndex,
        content: value || '',
      })
    }
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-dark-700 bg-dark-800">
      {projectId && (
        <div className="flex items-center gap-2 p-2 bg-dark-700 border-b border-dark-600">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-dark-300">
            {isConnected ? 'Collaborating' : 'Connecting...'}
          </span>
        </div>
      )}
      <MonacoEditor
        height="60vh"
        defaultLanguage={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        options={{
          fontSize: 16,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          smoothScrolling: true,
          automaticLayout: true,
        }}
        onMount={(editor) => {
          editorRef.current = editor
        }}
      />
    </div>
  )
} 