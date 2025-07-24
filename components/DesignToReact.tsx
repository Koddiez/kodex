'use client'

import { useState, useRef } from 'react'

interface DesignToReactProps {
  onGenerate: (prompt: string, type: 'component' | 'page' | 'feature') => Promise<void>
  isGenerating: boolean
}

interface UploadedDesign {
  id: string
  name: string
  url: string
  type: 'image' | 'figma' | 'sketch'
  size: number
}

export default function DesignToReact({ onGenerate, isGenerating }: DesignToReactProps) {
  const [uploadedDesigns, setUploadedDesigns] = useState<UploadedDesign[]>([])
  const [selectedDesign, setSelectedDesign] = useState<UploadedDesign | null>(null)
  const [conversionOptions, setConversionOptions] = useState({
    framework: 'react',
    styling: 'tailwind',
    responsive: true,
    accessibility: true,
    typescript: true
  })
  const [generationStep, setGenerationStep] = useState<'upload' | 'configure' | 'generating' | 'complete'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const design: UploadedDesign = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            url: e.target?.result as string,
            type: 'image',
            size: file.size
          }
          setUploadedDesigns(prev => [...prev, design])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleFigmaImport = () => {
    // Placeholder for Figma integration
    const figmaUrl = prompt('Enter Figma URL:')
    if (figmaUrl) {
      const design: UploadedDesign = {
        id: Date.now().toString(),
        name: 'Figma Design',
        url: figmaUrl,
        type: 'figma',
        size: 0
      }
      setUploadedDesigns(prev => [...prev, design])
    }
  }

  const selectDesign = (design: UploadedDesign) => {
    setSelectedDesign(design)
    setGenerationStep('configure')
  }

  const handleGenerate = async () => {
    if (!selectedDesign) return

    setGenerationStep('generating')
    
    try {
      const prompt = `Convert this ${selectedDesign.type} design to ${conversionOptions.framework} code using ${conversionOptions.styling} for styling. ${conversionOptions.responsive ? 'Make it responsive.' : ''} ${conversionOptions.accessibility ? 'Include accessibility features.' : ''} ${conversionOptions.typescript ? 'Use TypeScript.' : ''}`
      
      await onGenerate(prompt, 'component')
      setGenerationStep('complete')
    } catch (error) {
      setGenerationStep('configure')
    }
  }

  const resetProcess = () => {
    setSelectedDesign(null)
    setGenerationStep('upload')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (generationStep === 'generating') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-white text-xl font-semibold mb-2">Converting Design to Code</h3>
          <p className="text-gray-400">Analyzing design and generating React components...</p>
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-500">🔍 Analyzing design elements</div>
            <div className="text-sm text-gray-500">🎨 Extracting colors and typography</div>
            <div className="text-sm text-gray-500">📐 Calculating layouts and spacing</div>
            <div className="text-sm text-gray-500">⚛️ Generating React components</div>
          </div>
        </div>
      </div>
    )
  }

  if (generationStep === 'complete') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Design Converted Successfully!</h3>
          <p className="text-gray-400 mb-6">Your design has been converted to React code. Check the file explorer to see the generated components.</p>
          <button
            onClick={resetProcess}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Convert Another Design
          </button>
        </div>
      </div>
    )
  }

  if (generationStep === 'configure' && selectedDesign) {
    return (
      <div className="h-full bg-gray-900 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <div className="mb-6">
            <button
              onClick={() => setGenerationStep('upload')}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back to uploads
            </button>
            <h1 className="text-2xl font-bold text-white mb-2">Configure Conversion</h1>
            <p className="text-gray-400">Customize how your design will be converted to code</p>
          </div>

          {/* Selected Design Preview */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Selected Design</h3>
            <div className="flex items-center space-x-4">
              {selectedDesign.type === 'image' && (
                <img
                  src={selectedDesign.url}
                  alt={selectedDesign.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div>
                <p className="text-white font-medium">{selectedDesign.name}</p>
                <p className="text-gray-400 text-sm">{selectedDesign.type.toUpperCase()}</p>
                {selectedDesign.size > 0 && (
                  <p className="text-gray-400 text-sm">{formatFileSize(selectedDesign.size)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="space-y-6">
            {/* Framework */}
            <div>
              <label className="block text-white font-medium mb-3">Framework</label>
              <div className="grid grid-cols-3 gap-3">
                {['react', 'vue', 'angular'].map((framework) => (
                  <button
                    key={framework}
                    onClick={() => setConversionOptions(prev => ({ ...prev, framework }))}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      conversionOptions.framework === framework
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {framework.charAt(0).toUpperCase() + framework.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Styling */}
            <div>
              <label className="block text-white font-medium mb-3">Styling</label>
              <div className="grid grid-cols-3 gap-3">
                {['tailwind', 'css-modules', 'styled-components'].map((styling) => (
                  <button
                    key={styling}
                    onClick={() => setConversionOptions(prev => ({ ...prev, styling }))}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      conversionOptions.styling === styling
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {styling.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-white font-medium mb-3">Options</label>
              <div className="space-y-3">
                {[
                  { key: 'responsive', label: 'Responsive Design', description: 'Generate mobile-friendly layouts' },
                  { key: 'accessibility', label: 'Accessibility', description: 'Include ARIA labels and semantic HTML' },
                  { key: 'typescript', label: 'TypeScript', description: 'Generate TypeScript code with type definitions' }
                ].map((option) => (
                  <label key={option.key} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conversionOptions[option.key as keyof typeof conversionOptions] as boolean}
                      onChange={(e) => setConversionOptions(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      className="mt-1 w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-white font-medium">{option.label}</p>
                      <p className="text-gray-400 text-sm">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-8">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Convert to Code
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Design to React</h1>
          <p className="text-gray-400">Upload your designs and convert them to clean React code</p>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
            <div className="mb-4">
              <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">Upload Design Files</h3>
            <p className="text-gray-400 mb-4">Drag and drop your design files or click to browse</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Browse Files
              </button>
              <button
                onClick={handleFigmaImport}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Import from Figma
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Uploaded Designs */}
        {uploadedDesigns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Uploaded Designs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedDesigns.map((design) => (
                <div
                  key={design.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => selectDesign(design)}
                >
                  {design.type === 'image' && (
                    <img
                      src={design.url}
                      alt={design.name}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  {design.type === 'figma' && (
                    <div className="w-full h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded mb-3 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Figma</span>
                    </div>
                  )}
                  <h3 className="text-white font-medium mb-1">{design.name}</h3>
                  <p className="text-gray-400 text-sm">{design.type.toUpperCase()}</p>
                  {design.size > 0 && (
                    <p className="text-gray-400 text-sm">{formatFileSize(design.size)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">What You Can Convert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-2">Supported Formats</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• PNG, JPG, SVG images</li>
                <li>• Figma design files</li>
                <li>• Sketch files (coming soon)</li>
                <li>• Adobe XD (coming soon)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Generated Code</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Clean React components</li>
                <li>• Tailwind CSS styling</li>
                <li>• Responsive layouts</li>
                <li>• Accessibility features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}