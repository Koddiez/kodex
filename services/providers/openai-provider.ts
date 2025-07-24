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
} from '../../types/ai-service'

interface OpenAIConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAIProvider implements AIServiceProvider {
  public readonly name = 'openai'
  private config: OpenAIConfig
  private baseUrl = 'https://api.openai.com/v1'

  constructor(config: OpenAIConfig) {
    this.config = config
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
      return response.ok
    } catch (error) {
      console.warn('OpenAI provider not available:', error)
      return false
    }
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const startTime = Date.now()

    try {
      const messages = this.buildMessages(request)
      
      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data: OpenAIResponse = await response.json()
      const generatedText = data.choices[0]?.message?.content || ''
      
      const files = this.parseGeneratedFiles(generatedText, request)
      const explanation = this.extractExplanation(generatedText)
      const suggestions = this.extractSuggestions(generatedText)
      const dependencies = this.extractDependencies(generatedText)

      return {
        success: true,
        files,
        explanation,
        suggestions,
        dependencies,
        provider: this.name,
        usage: {
          tokensUsed: data.usage.total_tokens,
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
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'You are an expert code analyzer. Analyze the provided code for issues, complexity, and structure. Provide detailed feedback in JSON format.'
        },
        {
          role: 'user',
          content: `Analyze this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

File path: ${request.filePath}

Please provide analysis in the following JSON format:
{
  "issues": [
    {
      "type": "error|warning|info",
      "message": "description",
      "line": number,
      "column": number,
      "severity": "high|medium|low",
      "fixable": boolean,
      "suggestedFix": "optional fix"
    }
  ],
  "suggestions": [
    {
      "type": "performance|security|maintainability|accessibility|best-practice",
      "message": "description",
      "line": number,
      "column": number,
      "before": "current code",
      "after": "suggested code",
      "impact": "high|medium|low"
    }
  ],
  "complexity": {
    "cyclomaticComplexity": number,
    "linesOfCode": number,
    "maintainabilityIndex": number,
    "technicalDebt": number
  },
  "dependencies": ["array of dependencies"],
  "exports": ["array of exports"],
  "imports": ["array of imports"]
}`
        }
      ]

      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: 0.3
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data: OpenAIResponse = await response.json()
      const analysisText = data.choices[0]?.message?.content || '{}'
      const analysisData = this.parseJsonResponse(analysisText)

      return {
        success: true,
        issues: analysisData.issues || [],
        suggestions: analysisData.suggestions || [],
        complexity: analysisData.complexity || {
          cyclomaticComplexity: 0,
          linesOfCode: request.code.split('\n').length,
          maintainabilityIndex: 50,
          technicalDebt: 0
        },
        dependencies: analysisData.dependencies || [],
        exports: analysisData.exports || [],
        imports: analysisData.imports || [],
        provider: this.name
      }
    } catch (error) {
      return {
        success: false,
        issues: [],
        suggestions: [],
        complexity: {
          cyclomaticComplexity: 0,
          linesOfCode: request.code.split('\n').length,
          maintainabilityIndex: 50,
          technicalDebt: 0
        },
        dependencies: [],
        exports: [],
        imports: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      }
    }
  }

  async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResult> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'You are an expert programming instructor. Explain code clearly and comprehensively based on the user\'s experience level.'
        },
        {
          role: 'user',
          content: `Explain this ${request.language} code for a ${request.level} developer:

\`\`\`${request.language}
${request.code}
\`\`\`

${request.context ? `Context: ${request.context}` : ''}

Please provide:
1. A clear overall explanation
2. Breakdown of key sections
3. Important concepts used
4. Related topics to explore

Format as JSON:
{
  "explanation": "overall explanation",
  "breakdown": [
    {
      "section": "section name",
      "explanation": "detailed explanation",
      "line": optional_line_number,
      "importance": "high|medium|low"
    }
  ],
  "concepts": ["array of key concepts"],
  "relatedTopics": ["array of related topics"]
}`
        }
      ]

      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: 0.5
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data: OpenAIResponse = await response.json()
      const explanationText = data.choices[0]?.message?.content || '{}'
      const explanationData = this.parseJsonResponse(explanationText)

      return {
        success: true,
        explanation: explanationData.explanation || 'Code explanation generated',
        breakdown: explanationData.breakdown || [],
        concepts: explanationData.concepts || [],
        relatedTopics: explanationData.relatedTopics || [],
        provider: this.name
      }
    } catch (error) {
      return {
        success: false,
        explanation: '',
        breakdown: [],
        concepts: [],
        relatedTopics: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      }
    }
  }

  async suggestImprovements(request: ImprovementRequest): Promise<ImprovementResult> {
    try {
      const focusAreas = request.focus?.join(', ') || 'all areas'
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: `You are an expert code reviewer. Suggest improvements focusing on ${focusAreas}.`
        },
        {
          role: 'user',
          content: `Review and suggest improvements for this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

File path: ${request.filePath}
Focus areas: ${focusAreas}

Provide suggestions in JSON format:
{
  "improvements": [
    {
      "type": "performance|security|accessibility|maintainability|testing|documentation",
      "description": "what to improve",
      "before": "current code snippet",
      "after": "improved code snippet",
      "line": optional_line_number,
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "reasoning": "why this improvement helps"
    }
  ],
  "refactoredCode": "optional complete refactored version",
  "impact": {
    "performance": number_0_to_100,
    "maintainability": number_0_to_100,
    "security": number_0_to_100,
    "accessibility": number_0_to_100,
    "overall": number_0_to_100
  }
}`
        }
      ]

      const response = await this.makeRequest('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: 0.4
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data: OpenAIResponse = await response.json()
      const improvementText = data.choices[0]?.message?.content || '{}'
      const improvementData = this.parseJsonResponse(improvementText)

      return {
        success: true,
        improvements: improvementData.improvements || [],
        refactoredCode: improvementData.refactoredCode,
        impact: improvementData.impact || {
          performance: 0,
          maintainability: 0,
          security: 0,
          accessibility: 0,
          overall: 0
        },
        provider: this.name
      }
    } catch (error) {
      return {
        success: false,
        improvements: [],
        impact: {
          performance: 0,
          maintainability: 0,
          security: 0,
          accessibility: 0,
          overall: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      }
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  private buildMessages(request: CodeGenerationRequest): OpenAIMessage[] {
    const systemPrompt = this.buildSystemPrompt(request)
    const userPrompt = this.buildUserPrompt(request)

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }

  private buildSystemPrompt(request: CodeGenerationRequest): string {
    const basePrompt = `You are an expert ${request.context.language} developer specializing in ${request.context.framework}. Generate clean, production-ready code with proper TypeScript types, error handling, and modern best practices.`

    const typeSpecificPrompts = {
      component: `${basePrompt} When generating components, focus on reusability, accessibility, and proper prop typing. Include variants and responsive design.`,
      page: `${basePrompt} When generating pages, create complete layouts with proper routing, SEO optimization, and responsive design.`,
      feature: `${basePrompt} When generating features, create multiple related files including components, hooks, types, and utilities. Focus on scalability and maintainability.`,
      api: `${basePrompt} When generating API routes, include proper validation, error handling, authentication checks, and documentation.`,
      test: `${basePrompt} When generating tests, create comprehensive test suites with unit tests, integration tests, and proper mocking.`,
      'full-app': `${basePrompt} When generating full applications, create a complete project structure with proper architecture, routing, and state management.`,
      utility: `${basePrompt} When generating utilities, focus on pure functions, proper typing, and comprehensive error handling.`,
      hook: `${basePrompt} When generating React hooks, follow hooks rules, include proper dependencies, and add TypeScript types.`
    }

    return typeSpecificPrompts[request.type] || basePrompt
  }

  private buildUserPrompt(request: CodeGenerationRequest): string {
    const contextString = request.context.existingFiles.length > 0
      ? `\n\nExisting project context:\n${request.context.existingFiles.map(file => 
          `File: ${file.name}\n\`\`\`${file.language}\n${file.content.substring(0, 1000)}${file.content.length > 1000 ? '...' : ''}\n\`\`\``
        ).join('\n\n')}`
      : ''

    const constraintsString = request.constraints ? `
Requirements:
- Framework: ${request.context.framework}
- Language: ${request.context.language}
- ${request.constraints.accessibility ? '- Include accessibility features' : ''}
- ${request.constraints.responsive ? '- Make it responsive' : ''}
- ${request.constraints.includeTests ? '- Include test files' : ''}
- ${request.constraints.includeDocumentation ? '- Include documentation' : ''}
- ${request.constraints.styleGuide ? `- Follow ${request.constraints.styleGuide} style guide` : ''}
` : ''

    const preferencesString = request.preferences ? `
Preferences:
- Code style: ${request.preferences.codeStyle}
- CSS framework: ${request.preferences.cssFramework}
- State management: ${request.preferences.stateManagement}
- Testing framework: ${request.preferences.testingFramework}
- TypeScript: ${request.preferences.typescript ? 'Yes' : 'No'}
` : ''

    return `Generate ${request.type} code for: ${request.prompt}

${constraintsString}
${preferencesString}
${contextString}

Please provide the code with clear file names and structure. Include helpful comments and follow modern best practices.`
  }

  private parseGeneratedFiles(text: string, request: CodeGenerationRequest): GeneratedFile[] {
    const files: GeneratedFile[] = []
    
    // Look for code blocks with file names
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+\.(?:tsx?|jsx?|css|html|json|md)))?[\r\n]([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || request.context.language
      const fileName = match[2] || this.generateFileName(request)
      const content = match[3]?.trim()

      if (content) {
        files.push({
          path: fileName,
          content,
          language,
          description: `Generated ${request.type} file`
        })
      }
    }

    // If no files found, treat entire response as single file
    if (files.length === 0) {
      files.push({
        path: this.generateFileName(request),
        content: text,
        language: request.context.language,
        description: `Generated ${request.type}`
      })
    }

    return files
  }

  private generateFileName(request: CodeGenerationRequest): string {
    const baseName = request.prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30)

    const extensions = {
      typescript: 'ts',
      javascript: 'js',
      react: 'tsx',
      vue: 'vue',
      html: 'html',
      css: 'css'
    }

    const ext = extensions[request.context.language as keyof typeof extensions] || 'ts'
    return `${baseName || 'generated'}.${ext}`
  }

  private extractExplanation(text: string): string {
    // Look for explanation patterns
    const explanationPatterns = [
      /(?:explanation|description):\s*(.+?)(?:\n\n|\n(?=[A-Z])|$)/i,
      /(?:this|here's what).*?(?:does|creates|generates):\s*(.+?)(?:\n\n|\n(?=[A-Z])|$)/i
    ]

    for (const pattern of explanationPatterns) {
      const match = text.match(pattern)
      if (match?.[1]) {
        return match[1].trim()
      }
    }

    return 'Code generated successfully'
  }

  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = []
    
    // Look for suggestion patterns
    const suggestionPatterns = [
      /(?:suggestions?|recommendations?|tips?):\s*(.+?)(?:\n\n|\n(?=[A-Z])|$)/i,
      /(?:you (?:might|could|should))(.+?)(?:\n\n|\n(?=[A-Z])|$)/gi
    ]

    for (const pattern of suggestionPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match?.[1]) {
          suggestions.push(match[1].trim())
        }
      }
    }

    return suggestions
  }

  private extractDependencies(text: string): string[] {
    const dependencies: string[] = []
    
    // Look for import statements and package mentions
    const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g
    const packageRegex = /npm install\s+([\w\-@\/\s]+)/g
    
    let match
    while ((match = importRegex.exec(text)) !== null) {
      const dep = match[1]
      if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep)
      }
    }

    while ((match = packageRegex.exec(text)) !== null) {
      const packages = match[1]?.split(/\s+/).filter(p => p.trim())
      if (packages) {
        dependencies.push(...packages)
      }
    }

    return [...new Set(dependencies)]
  }

  private parseJsonResponse(text: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0])
      }
      
      // If no JSON blocks found, try parsing the entire text
      return JSON.parse(text)
    } catch (error) {
      console.warn('Failed to parse JSON response:', error)
      return {}
    }
  }
}