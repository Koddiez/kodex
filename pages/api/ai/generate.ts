import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import type { AuthOptions } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'

interface GenerateRequest {
    prompt: string
    language?: string
    framework?: string
    type?: 'component' | 'page' | 'feature' | 'function' | 'api' | 'full-app'
    context?: Array<{
        id: string
        name: string
        content: string
        language: string
    }>
}

interface GenerateResponse {
    code: string
    explanation: string
    files?: Array<{
        name: string
        content: string
        language: string
    }>
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GenerateResponse | { error: string }>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const session = await getServerSession(req, res, authOptions as AuthOptions)

        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { prompt, language = 'typescript', framework = 'react', type = 'component', context = [] }: GenerateRequest = req.body

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' })
        }

        // Build context from existing files
        const contextString = context.length > 0
            ? `\n\nExisting project context:\n${context.map(file => `File: ${file.name}\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join('\n\n')}`
            : ''

        // Enhanced system prompt based on type
        const getSystemPrompt = (type: string, framework: string, language: string) => {
            const basePrompt = `You are an expert ${language} developer specializing in ${framework}. Generate clean, production-ready code with proper TypeScript types, error handling, and modern best practices.`

            switch (type) {
                case 'feature':
                    return `${basePrompt} When generating features, create multiple related files including components, hooks, types, and utilities. Focus on scalability and maintainability.`
                case 'page':
                    return `${basePrompt} When generating pages, create complete layouts with proper routing, SEO optimization, and responsive design using Tailwind CSS.`
                case 'component':
                    return `${basePrompt} When generating components, focus on reusability, accessibility, and proper prop typing. Include variants and responsive design.`
                default:
                    return basePrompt
            }
        }

        const getUserPrompt = (prompt: string, type: string, framework: string, language: string) => {
            return `Generate ${type} code for: ${prompt}

Requirements:
- Framework: ${framework}
- Language: ${language}
- Use Tailwind CSS for styling
- Include TypeScript types
- Make it responsive and accessible
- Follow modern React patterns (hooks, functional components)
- Include proper error handling
- Add helpful comments

${type === 'feature' ? 'Generate multiple related files as needed (components, hooks, types, utils).' : ''}
${type === 'page' ? 'Include proper page structure with SEO meta tags and responsive layout.' : ''}

${contextString}

Return the code in a structured format with clear file names and content.`
        }

        // Check if API keys are available
        const hasClaude = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_claude_api_key_here'
        const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'CC9JSn2jNq-NqJKCI4SZ6_EebASIEcqsYA'
        const hasMoonshot = process.env.MOONSHOT_API_KEY && process.env.MOONSHOT_API_KEY !== '1PsPNSDUWa3HRDjplFYn9LTzzXYnD2Mhp'

        let generatedCode = ''
        let explanation = ''

        // Try Claude first (best for code generation)
        if (hasClaude) {
            try {
                console.log('Using Claude AI for code generation...')
                const anthropic = new Anthropic({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                })

                const systemPrompt = getSystemPrompt(type, framework, language)
                const userPrompt = getUserPrompt(prompt, type, framework, language)

                const message = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4000,
                    temperature: 0.7,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ]
                })

                if (message.content && message.content.length > 0) {
                    const content = message.content[0]
                    if (content.type === 'text') {
                        generatedCode = content.text
                        explanation = `Generated ${type} using Claude 3.5 Sonnet`
                        console.log('Claude generation successful!')
                    }
                }
            } catch (error) {
                console.log('Claude API failed:', error)
                console.log('Trying fallback generators...')
            }
        } else {
            console.log('Claude API key not configured, using fallback generators...')
        }

        // Fallback to OpenAI if Claude fails
        if (!generatedCode && hasOpenAI) {
            try {
                console.log('Using OpenAI as fallback...')
                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: getSystemPrompt(type, framework, language)
                            },
                            {
                                role: 'user',
                                content: getUserPrompt(prompt, type, framework, language)
                            }
                        ],
                        max_tokens: 4000,
                        temperature: 0.7,
                    }),
                })

                if (openaiResponse.ok) {
                    const openaiData = await openaiResponse.json()
                    generatedCode = openaiData.choices[0].message.content
                    explanation = `Generated ${type} using OpenAI GPT-4`
                    console.log('OpenAI generation successful!')
                }
            } catch (error) {
                console.log('OpenAI API failed, trying Moonshot...', error)
            }
        }

        // Fallback to Moonshot if both Claude and OpenAI fail
        if (!generatedCode && hasMoonshot) {
            try {
                console.log('Using Moonshot as final fallback...')
                const moonshotResponse = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'moonshot-v1-8k',
                        messages: [
                            {
                                role: 'system',
                                content: `You are an expert ${language} developer. Generate clean, production-ready code.`
                            },
                            {
                                role: 'user',
                                content: `Generate ${type} code for: ${prompt}`
                            }
                        ],
                        max_tokens: 2000,
                        temperature: 0.7,
                    }),
                })

                if (moonshotResponse.ok) {
                    const moonshotData = await moonshotResponse.json()
                    generatedCode = moonshotData.choices[0].message.content
                    explanation = `Generated ${type} using Moonshot AI`
                    console.log('Moonshot generation successful!')
                }
            } catch (error) {
                console.log('Moonshot API also failed, using fallback generator...', error)
            }
        }

        // Enhanced Fallback: Generate high-quality demo code if APIs are not available
        if (!generatedCode) {
            console.log('Using enhanced Kodex AI Generator...')
            generatedCode = generateEnhancedFallbackCode(prompt, type, framework, language)
            explanation = `Generated ${type} using Kodex AI Generator (Enhanced)`
        }

        res.status(200).json({
            code: generatedCode,
            explanation,
            files: [{
                name: `${prompt.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)}.${getFileExtension(language)}`,
                content: generatedCode,
                language: language
            }]
        })

    } catch (error) {
        console.error('AI Generation Error:', error)
        res.status(500).json({ error: 'Failed to generate code' })
    }
}

function generateFallbackCode(prompt: string, type: string, framework: string, language: string): string {
    const componentName = prompt
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20) || 'GeneratedComponent'

    switch (type) {
        case 'component':
            return `import React from 'react'

interface ${componentName}Props {
  className?: string
  children?: React.ReactNode
}

export default function ${componentName}({ className, children }: ${componentName}Props) {
  return (
    <div className={\`p-4 bg-white rounded-lg shadow-md \${className || ''}\`}>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        ${componentName}
      </h2>
      <p className="text-gray-600">
        This is a generated component for: ${prompt}
      </p>
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}`

        case 'page':
            return `import React from 'react'
import Head from 'next/head'

export default function ${componentName}Page() {
  return (
    <>
      <Head>
        <title>${componentName} - Kodex</title>
        <meta name="description" content="Generated page for ${prompt}" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ${componentName}
            </h1>
            <p className="text-xl text-gray-600">
              Generated page for: ${prompt}
            </p>
          </header>
          
          <main className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Welcome to ${componentName}
              </h2>
              <p className="text-gray-600 mb-6">
                This page was generated based on your request: "${prompt}"
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Feature 1
                  </h3>
                  <p className="text-blue-700">
                    Add your first feature here
                  </p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 mb-2">
                    Feature 2
                  </h3>
                  <p className="text-green-700">
                    Add your second feature here
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}`

        case 'feature':
            return `// ${componentName} Feature
import React, { useState, useEffect } from 'react'

// Types
interface ${componentName}Data {
  id: string
  name: string
  description: string
  createdAt: Date
}

// Custom Hook
export function use${componentName}() {
  const [data, setData] = useState<${componentName}Data[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        setLoading(true)
        // Replace with actual API call
        const mockData: ${componentName}Data[] = [
          {
            id: '1',
            name: 'Sample Item',
            description: 'Generated for: ${prompt}',
            createdAt: new Date()
          }
        ]
        setData(mockData)
      } catch (err) {
        setError('Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error, setData }
}

// Main Component
export default function ${componentName}Feature() {
  const { data, loading, error } = use${componentName}()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        ${componentName} Feature
      </h2>
      <p className="text-gray-600">
        Generated feature for: ${prompt}
      </p>
      
      <div className="grid gap-4">
        {data.map((item) => (
          <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            <p className="text-gray-600 mt-1">{item.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Created: {item.createdAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}`

        default:
            return `// Generated code for: ${prompt}
import React from 'react'

export default function ${componentName}() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        ${componentName}
      </h1>
      <p className="text-gray-600">
        This code was generated for: "${prompt}"
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 This is demo code generated by Kodex. 
          Configure your OpenAI or Moonshot API keys for advanced AI generation.
        </p>
      </div>
    </div>
  )
}`
    }
}

function generateEnhancedFallbackCode(prompt: string, type: string, framework: string, language: string): string {
    const componentName = prompt
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20) || 'GeneratedComponent'

    // Enhanced templates with better functionality
    switch (type) {
        case 'component':
            if (prompt.toLowerCase().includes('form') || prompt.toLowerCase().includes('login')) {
                return `import React, { useState } from 'react'

interface ${componentName}Props {
  onSubmit?: (data: FormData) => void
  className?: string
}

interface FormData {
  email: string
  password: string
}

export default function ${componentName}({ onSubmit, className }: ${componentName}Props) {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={\`max-w-md mx-auto bg-white rounded-lg shadow-md p-6 \${className || ''}\`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        ${componentName.replace('Form', '').replace('Login', 'Sign In')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}`
            }
            
            if (prompt.toLowerCase().includes('button') || prompt.toLowerCase().includes('card')) {
                return `import React from 'react'

interface ${componentName}Props {
  title?: string
  description?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  children?: React.ReactNode
}

export default function ${componentName}({ 
  title, 
  description, 
  onClick, 
  variant = 'primary',
  className,
  children 
}: ${componentName}Props) {
  const baseClasses = "p-6 rounded-lg transition-all duration-200 cursor-pointer"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300",
    outline: "bg-white text-gray-900 border-2 border-blue-600 hover:bg-blue-50"
  }

  return (
    <div 
      className={\`\${baseClasses} \${variantClasses[variant]} \${className || ''}\`}
      onClick={onClick}
    >
      {title && (
        <h3 className="text-xl font-semibold mb-2">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-sm opacity-90 mb-4">
          {description}
        </p>
      )}
      
      {children}
      
      <div className="mt-4 text-sm opacity-75">
        Generated for: {prompt}
      </div>
    </div>
  )
}`
            }

            // Default component
            return generateFallbackCode(prompt, type, framework, language)

        case 'page':
            return `import React from 'react'
import Head from 'next/head'

export default function ${componentName}Page() {
  return (
    <>
      <Head>
        <title>${componentName} - Kodex</title>
        <meta name="description" content="Generated page for ${prompt}" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">${componentName}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Welcome to ${componentName}
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              This page was generated for: "${prompt}"
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <button className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <span className="text-xl">✨</span>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Feature {item}</p>
                    <p className="mt-2 ml-16 text-base text-gray-500">
                      This is a sample feature description for your ${componentName} page.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}`

        case 'feature':
            return `// ${componentName} Feature - Enhanced Implementation
import React, { useState, useEffect, useCallback } from 'react'

// Types
interface ${componentName}Item {
  id: string
  title: string
  description: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: Date
  updatedAt: Date
}

interface ${componentName}State {
  items: ${componentName}Item[]
  loading: boolean
  error: string | null
  filter: 'all' | 'active' | 'inactive' | 'pending'
}

// Custom Hook
export function use${componentName}() {
  const [state, setState] = useState<${componentName}State>({
    items: [],
    loading: true,
    error: null,
    filter: 'all'
  })

  const fetchItems = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Simulate API call with realistic data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockItems: ${componentName}Item[] = [
        {
          id: '1',
          title: 'Sample Item 1',
          description: 'Generated for: ${prompt}',
          status: 'active',
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Sample Item 2',
          description: 'Another item for your ${componentName} feature',
          status: 'pending',
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 3600000)
        }
      ]
      
      setState(prev => ({ ...prev, items: mockItems, loading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch items', 
        loading: false 
      }))
    }
  }, [])

  const addItem = useCallback((title: string, description: string) => {
    const newItem: ${componentName}Item = {
      id: Date.now().toString(),
      title,
      description,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    setState(prev => ({ 
      ...prev, 
      items: [...prev.items, newItem] 
    }))
  }, [])

  const updateItemStatus = useCallback((id: string, status: ${componentName}Item['status']) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id 
          ? { ...item, status, updatedAt: new Date() }
          : item
      )
    }))
  }, [])

  const filteredItems = state.items.filter(item => 
    state.filter === 'all' || item.status === state.filter
  )

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return {
    ...state,
    filteredItems,
    addItem,
    updateItemStatus,
    setFilter: (filter: ${componentName}State['filter']) => 
      setState(prev => ({ ...prev, filter })),
    refresh: fetchItems
  }
}

// Main Component
export default function ${componentName}Feature() {
  const { 
    filteredItems, 
    loading, 
    error, 
    filter, 
    addItem, 
    updateItemStatus, 
    setFilter,
    refresh
  } = use${componentName}()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTitle.trim()) {
      addItem(newTitle, newDescription)
      setNewTitle('')
      setNewDescription('')
      setShowAddForm(false)
    }
  }

  const getStatusColor = (status: ${componentName}Item['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading ${componentName}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <span className="text-red-500 text-xl mr-3">⚠️</span>
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={refresh}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">${componentName} Feature</h2>
          <p className="text-gray-600 mt-1">Generated feature for: ${prompt}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add New Item
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Add Item
            </button>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'active', 'inactive', 'pending'] as const).map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={\`px-4 py-2 rounded-md text-sm font-medium transition-colors \${
              filter === filterOption
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }\`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <span className={\`px-2 py-1 rounded-full text-xs font-medium \${getStatusColor(item.status)}\`}>
                {item.status}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">{item.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Created: {item.createdAt.toLocaleDateString()}</span>
              <select
                value={item.status}
                onChange={(e) => updateItemStatus(item.id, e.target.value as ${componentName}Item['status'])}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📝</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500">Add your first item to get started.</p>
        </div>
      )}
    </div>
  )
}`

        default:
            return generateFallbackCode(prompt, type, framework, language)
    }
}

function getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
        javascript: 'js',
        typescript: 'ts',
        react: 'tsx',
        python: 'py',
        html: 'html',
        css: 'css',
        scss: 'scss',
        json: 'json'
    }
    return extensions[language.toLowerCase()] || 'txt'
}