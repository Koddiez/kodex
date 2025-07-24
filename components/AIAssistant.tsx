'use client'

import { useState, useRef, useEffect } from 'react'

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

interface AIAssistantProps {
  onGenerate: (prompt: string, type: 'component' | 'page' | 'feature') => Promise<void>
  isGenerating: boolean
  project: Project | null
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  code?: string
  language?: string
}

export default function AIAssistant({ onGenerate, isGenerating, project }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m your AI coding assistant. I can help you:\n\n• Generate React components\n• Create pages and layouts\n• Build features and functionality\n• Debug and optimize code\n• Suggest improvements\n\nWhat would you like to build?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [selectedType, setSelectedType] = useState<'component' | 'page' | 'feature'>('component')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    // Add thinking message
    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Generating code...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      const userInput = userMessage.content
      
      // Call onGenerate to add to project
      await onGenerate(userInput, selectedType)
      
      // Replace thinking message with success
      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id 
          ? { 
              ...msg, 
              content: `✅ Generated ${selectedType} successfully!\n\nThe code has been added to your project. Check the file explorer to see the new file and start editing!`
            }
          : msg
      ))
    } catch (error) {
      console.error('AI generation error:', error)
      // Replace thinking message with error
      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id 
          ? { 
              ...msg, 
              content: `❌ Failed to generate code.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again with a more specific prompt.` 
            }
          : msg
      ))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const quickPrompts = [
    { text: 'Create a login form', type: 'component' as const },
    { text: 'Build a dashboard layout', type: 'page' as const },
    { text: 'Add user authentication', type: 'feature' as const },
    { text: 'Create a data table', type: 'component' as const },
    { text: 'Build a landing page', type: 'page' as const },
    { text: 'Add dark mode toggle', type: 'feature' as const }
  ]

  const useQuickPrompt = (prompt: string, type: 'component' | 'page' | 'feature') => {
    setInput(prompt)
    setSelectedType(type)
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h3 className="text-white font-medium">Kodex AI Assistant</h3>
            <p className="text-gray-400 text-xs">Powered by Claude 3.5 Sonnet</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              {message.code && (
                <div className="mt-2 bg-gray-900 rounded p-2 overflow-x-auto">
                  <pre className="text-xs text-green-400">
                    <code>{message.code}</code>
                  </pre>
                </div>
              )}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="p-4 border-t border-gray-700">
        <div className="mb-3">
          <p className="text-gray-400 text-xs mb-2">Quick prompts:</p>
          <div className="grid grid-cols-1 gap-1">
            {quickPrompts.slice(0, 3).map((prompt, index) => (
              <button
                key={index}
                onClick={() => useQuickPrompt(prompt.text, prompt.type)}
                className="text-left text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded p-2 transition-colors"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type Selector */}
          <div className="flex space-x-1">
            {(['component', 'page', 'feature'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Input Field */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe the ${selectedType} you want to create...`}
              className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg p-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </div>
        </form>
      </div>
    </div>
  )
}