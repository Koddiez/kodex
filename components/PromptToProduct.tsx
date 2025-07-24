'use client'

import { useState } from 'react'

interface PromptToProductProps {
  onGenerate: (prompt: string, type: 'component' | 'page' | 'feature') => Promise<void>
  isGenerating: boolean
}

interface ProductTemplate {
  id: string
  name: string
  description: string
  icon: string
  features: string[]
  tech: string[]
}

export default function PromptToProduct({ onGenerate, isGenerating }: PromptToProductProps) {
  const [productIdea, setProductIdea] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<'input' | 'generating' | 'complete'>('input')

  const templates: ProductTemplate[] = [
    {
      id: 'saas-dashboard',
      name: 'SaaS Dashboard',
      description: 'Complete dashboard with auth, analytics, and user management',
      icon: '📊',
      features: ['User Authentication', 'Dashboard Analytics', 'User Management', 'Settings Panel', 'Billing Integration'],
      tech: ['React', 'TypeScript', 'Tailwind CSS', 'Chart.js']
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Store',
      description: 'Full-featured online store with cart and checkout',
      icon: '🛒',
      features: ['Product Catalog', 'Shopping Cart', 'Checkout Flow', 'User Accounts', 'Order Management'],
      tech: ['React', 'TypeScript', 'Stripe', 'Tailwind CSS']
    },
    {
      id: 'booking-app',
      name: 'Booking Platform',
      description: 'Appointment booking system with calendar integration',
      icon: '📅',
      features: ['Calendar View', 'Booking System', 'User Profiles', 'Notifications', 'Payment Processing'],
      tech: ['React', 'TypeScript', 'Calendar API', 'Tailwind CSS']
    },
    {
      id: 'social-app',
      name: 'Social Platform',
      description: 'Social media app with posts, comments, and messaging',
      icon: '💬',
      features: ['User Profiles', 'Post Creation', 'Comments System', 'Real-time Chat', 'Feed Algorithm'],
      tech: ['React', 'TypeScript', 'Socket.io', 'Tailwind CSS']
    },
    {
      id: 'portfolio',
      name: 'Portfolio Website',
      description: 'Professional portfolio with projects and contact form',
      icon: '🎨',
      features: ['Project Showcase', 'About Section', 'Contact Form', 'Blog', 'Responsive Design'],
      tech: ['React', 'TypeScript', 'Framer Motion', 'Tailwind CSS']
    },
    {
      id: 'custom',
      name: 'Custom Product',
      description: 'Describe your own product idea',
      icon: '✨',
      features: ['Custom Features'],
      tech: ['React', 'TypeScript', 'Tailwind CSS']
    }
  ]

  const handleGenerate = async () => {
    if (!productIdea.trim()) return

    setGenerationStep('generating')
    
    try {
      const prompt = selectedTemplate === 'custom' 
        ? productIdea
        : `Create a ${templates.find(t => t.id === selectedTemplate)?.name} with the following requirements: ${productIdea}`
      
      await onGenerate(prompt, 'feature')
      setGenerationStep('complete')
    } catch (error) {
      setGenerationStep('input')
    }
  }

  const resetForm = () => {
    setProductIdea('')
    setSelectedTemplate(null)
    setGenerationStep('input')
  }

  if (generationStep === 'generating') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-white text-xl font-semibold mb-2">Generating Your Product</h3>
          <p className="text-gray-400">This may take a few moments...</p>
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-500">🔍 Analyzing requirements</div>
            <div className="text-sm text-gray-500">🏗️ Generating architecture</div>
            <div className="text-sm text-gray-500">⚛️ Creating components</div>
            <div className="text-sm text-gray-500">🎨 Styling interface</div>
          </div>
        </div>
      </div>
    )
  }

  if (generationStep === 'complete') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Product Generated Successfully!</h3>
          <p className="text-gray-400 mb-6">Your product has been created. Check the file explorer to see the generated files.</p>
          <button
            onClick={resetForm}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Another Product
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Prompt to Product</h1>
          <p className="text-gray-400">Transform your ideas into fully functional products with AI</p>
        </div>

        {/* Template Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Choose a Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{template.icon}</span>
                  <h3 className="text-white font-medium">{template.name}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.features.slice(0, 3).map((feature, index) => (
                        <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {template.features.length > 3 && (
                        <span className="text-xs text-gray-500">+{template.features.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tech Stack:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tech.map((tech, index) => (
                        <span key={index} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Product Description */}
        {selectedTemplate && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Describe Your Product</h2>
            <div className="bg-gray-800 rounded-lg p-4">
              <textarea
                value={productIdea}
                onChange={(e) => setProductIdea(e.target.value)}
                placeholder={
                  selectedTemplate === 'custom'
                    ? "Describe your product idea in detail. Include features, target audience, and any specific requirements..."
                    : `Describe specific features and requirements for your ${templates.find(t => t.id === selectedTemplate)?.name}...`
                }
                className="w-full h-32 bg-gray-700 text-white placeholder-gray-400 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-400">
                  {productIdea.length}/1000 characters
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!productIdea.trim() || isGenerating}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Example Prompts</h3>
          <div className="space-y-3">
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-300 text-sm">
                "A task management app for teams with real-time collaboration, file sharing, and progress tracking. Include Kanban boards, time tracking, and team chat."
              </p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-300 text-sm">
                "An online learning platform with video courses, quizzes, progress tracking, and certificates. Include user profiles, course ratings, and discussion forums."
              </p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-300 text-sm">
                "A fitness tracking app with workout plans, nutrition logging, progress photos, and social features. Include goal setting, achievements, and trainer connections."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}