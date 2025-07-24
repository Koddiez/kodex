import {
  AIServiceProvider,
  CodeGenerationRequest,
  CodeGenerationResult,
  CodeAnalysisRequest,
  CodeAnalysisResult,
  CodeExplanationRequest,
  CodeExplanationResult,
  ImprovementRequest,
  ImprovementResult,
  GeneratedFile
} from '@/types/ai-service'

interface FallbackConfig {
  enabled: boolean
  templates: Record<string, string>
}

export class FallbackProvider implements AIServiceProvider {
  public readonly name = 'fallback'
  private config: FallbackConfig
  private templates: Map<string, string> = new Map()

  constructor(config: FallbackConfig) {
    this.config = config
    this.initializeTemplates()
  }

  private initializeTemplates(): void {
    // Basic component templates
    this.templates.set('react-component', `import React from 'react'

interface {{ComponentName}}Props {
  // Add your props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = (props) => {
  return (
    <div>
      {/* Your component content here */}
    </div>
  )
}

export default {{ComponentName}}`)

    this.templates.set('react-hook', `import { useState, useEffect } from 'react'

export const {{HookName}} = () => {
  const [state, setState] = useState(null)

  useEffect(() => {
    // Your effect logic here
  }, [])

  return {
    state,
    setState
  }
}`)

    this.templates.set('api-route', `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Your GET logic here
    return NextResponse.json({ message: 'Success' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Your POST logic here
    return NextResponse.json({ message: 'Created' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}`)

    this.templates.set('utility-function', `/**
 * {{FunctionDescription}}
 */
export const {{FunctionName}} = (input: any): any => {
  // Your utility logic here
  return input
}`)

    this.templates.set('test-file', `import { render, screen } from '@testing-library/react'
import { {{ComponentName}} } from './{{ComponentName}}'

describe('{{ComponentName}}', () => {
  it('should render correctly', () => {
    render(<{{ComponentName}} />)
    // Add your test assertions here
  })
})`)

    // Add custom templates from config
    Object.entries(this.config.templates).forEach(([key, template]) => {
      this.templates.set(key, template)
    })
  }

  async isAvailable(): Promise<boolean> {
    return this.config.enabled
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const startTime = Date.now()

    try {
      const templateKey = this.getTemplateKey(request.type)
      const template = this.templates.get(templateKey)

      if (!template) {
        throw new Error(`No template available for ${request.type}`)
      }

      const files = this.generateFromTemplate(template, request)
      
      return {
        success: true,
        files,
        explanation: `Generated ${request.type} using fallback template`,
        suggestions: [
          'This is a basic template. Consider using AI providers for more sophisticated code generation.',
          'Customize the generated code to match your specific requirements.',
          'Add proper error handling and validation as needed.'
        ],
        dependencies: this.extractTemplateDependencies(request.type),
        provider: this.name,
        usage: {
          tokensUsed: 0,
          duration: Date.now() - startTime
        }
      }
    } catch (error) {
      return {
        success: false,
        files: [],
        explanation: '',
        suggestions: [],
        dependencies: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        usage: {
          tokensUsed: 0,
          duration: Date.now() - startTime
        }
      }
    }
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    // Basic static analysis
    const lines = request.code.split('\n')
    const issues = []
    const suggestions = []

    // Simple checks
    if (request.code.includes('console.log')) {
      issues.push({
        type: 'warning' as const,
        message: 'Console.log statements found - consider removing for production',
        line: lines.findIndex(line => line.includes('console.log')) + 1,
        column: 0,
        severity: 'low' as const,
        fixable: true,
        suggestedFix: 'Remove console.log statements'
      })
    }

    if (request.code.includes('any')) {
      suggestions.push({
        type: 'maintainability' as const,
        message: 'Consider using specific types instead of "any"',
        line: lines.findIndex(line => line.includes('any')) + 1,
        column: 0,
        before: 'any',
        after: 'specific type',
        impact: 'medium' as const
      })
    }

    return {
      success: true,
      issues,
      suggestions,
      complexity: {
        cyclomaticComplexity: Math.min(lines.length / 10, 10),
        linesOfCode: lines.length,
        maintainabilityIndex: Math.max(100 - lines.length / 10, 0),
        technicalDebt: issues.length * 0.1
      },
      dependencies: [],
      exports: [],
      imports: [],
      provider: this.name
    }
  }

  async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResult> {
    const lines = request.code.split('\n')
    
    return {
      success: true,
      explanation: `This ${request.language} code contains ${lines.length} lines. Basic fallback explanation provided.`,
      breakdown: [
        {
          section: 'Code Structure',
          explanation: 'The code follows standard patterns for the language',
          importance: 'medium' as const
        }
      ],
      concepts: [request.language, 'programming'],
      relatedTopics: ['best practices', 'code organization'],
      provider: this.name
    }
  }

  async suggestImprovements(request: ImprovementRequest): Promise<ImprovementResult> {
    const improvements = []
    
    // Basic improvement suggestions
    if (request.code.includes('var ')) {
      improvements.push({
        type: 'maintainability' as const,
        description: 'Use const or let instead of var',
        before: 'var variable',
        after: 'const variable',
        impact: 'medium' as const,
        effort: 'low' as const,
        reasoning: 'const and let have block scope and prevent hoisting issues'
      })
    }

    return {
      success: true,
      improvements,
      impact: {
        performance: 0,
        maintainability: improvements.length > 0 ? 20 : 0,
        security: 0,
        accessibility: 0,
        overall: improvements.length > 0 ? 15 : 0
      },
      provider: this.name
    }
  }

  private getTemplateKey(type: string): string {
    const templateMap: Record<string, string> = {
      'component': 'react-component',
      'hook': 'react-hook',
      'api': 'api-route',
      'utility': 'utility-function',
      'test': 'test-file'
    }

    return templateMap[type] || 'react-component'
  }

  private generateFromTemplate(template: string, request: CodeGenerationRequest): GeneratedFile[] {
    const componentName = this.extractComponentName(request.prompt)
    const fileName = this.generateFileName(request, componentName)
    
    let content = template
      .replace(/\{\{ComponentName\}\}/g, componentName)
      .replace(/\{\{HookName\}\}/g, `use${componentName}`)
      .replace(/\{\{FunctionName\}\}/g, componentName.toLowerCase())
      .replace(/\{\{FunctionDescription\}\}/g, request.prompt)

    return [{
      path: fileName,
      content,
      language: request.context.language,
      description: `Generated ${request.type} from template`
    }]
  }

  private extractComponentName(prompt: string): string {
    // Extract a component name from the prompt
    const words = prompt
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())

    return words.slice(0, 3).join('') || 'GeneratedComponent'
  }

  private generateFileName(request: CodeGenerationRequest, componentName: string): string {
    const extensions: Record<string, string> = {
      'component': 'tsx',
      'hook': 'ts',
      'api': 'ts',
      'utility': 'ts',
      'test': 'test.tsx'
    }

    const ext = extensions[request.type] || 'tsx'
    return `${componentName}.${ext}`
  }

  private extractTemplateDependencies(type: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      'component': ['react'],
      'hook': ['react'],
      'api': ['next'],
      'test': ['@testing-library/react', '@testing-library/jest-dom']
    }

    return dependencyMap[type] || []
  }
}