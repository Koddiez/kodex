"use client"

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Code, Loader2 } from 'lucide-react'

interface AIChatProps {
  onInsertCode?: (code: string, language: string) => void
  currentLanguage?: string
}

export default function AIChat({ onInsertCode, currentLanguage = 'javascript' }: AIChatProps) {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I am Kodex AI. Ask me to generate code or help with your project!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    setLoading(true)
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: input }
    ])
    const userInput = input
    setInput('')

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userInput, 
          language: currentLanguage 
        }),
      })

      const data = await response.json()
      
      if (data.code) {
        setMessages((prev) => [
          ...prev,
          { 
            sender: 'ai', 
            text: `Here's the code for "${userInput}":`,
            code: data.code,
            language: data.language
          }
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: 'Sorry, I could not generate code for that request.' }
        ])
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, there was an error generating code. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const insertCode = (code: string, language: string) => {
    onInsertCode?.(code, language)
  }

  return (
    <div className="flex flex-col h-96 w-full max-w-md bg-dark-800 border border-dark-700 rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <span className="font-semibold gradient-text">Kodex AI Assistant</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 mb-2 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-2">
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                msg.sender === 'ai'
                  ? 'bg-primary-600/20 text-primary-100 self-start'
                  : 'bg-dark-700 text-white self-end'
              }`}
            >
              {msg.text}
            </div>
            {msg.code && (
              <div className="bg-dark-900 border border-dark-600 rounded-lg p-3 max-w-[80%] self-start">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400">{msg.language}</span>
                  <button
                    onClick={() => insertCode(msg.code, msg.language)}
                    className="text-primary-500 hover:text-primary-400 text-xs flex items-center gap-1"
                  >
                    <Code className="w-3 h-3" /> Insert
                  </button>
                </div>
                <pre className="text-xs text-dark-200 overflow-x-auto">
                  <code>{msg.code}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-primary-500">
            <Loader2 className="animate-spin w-4 h-4" />
            <span className="text-sm">Generating code...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="flex items-center gap-2 mt-2"
        onSubmit={e => {
          e.preventDefault()
          sendMessage()
        }}
      >
        <input
          className="input-field flex-1"
          placeholder="Ask Kodex AI to generate code..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary px-4 py-2 flex items-center gap-1" disabled={loading}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
} 