/**
 * Integration test for AI Service Manager
 * This test can be run directly with ts-node to verify the implementation
 */

import { getAIServiceManager } from '../ai-service-manager'
import { CodeGenerationRequest } from '@/types/ai-service'

async function testAIServiceManager() {
  console.log('🧪 Testing AI Service Manager Integration...')
  
  try {
    // Get the AI service manager instance
    const aiManager = getAIServiceManager()
    console.log('✅ AI Service Manager initialized successfully')
    
    // Test provider availability
    const providers = aiManager.getAvailableProviders()
    console.log('📋 Available providers:', providers)
    
    // Test provider status
    const status = await aiManager.getProviderStatus()
    console.log('🔍 Provider status:', status)
    
    // Test basic code generation with fallback provider
    const request: CodeGenerationRequest = {
      prompt: 'Create a simple React button component',
      type: 'component',
      context: {
        framework: 'react',
        language: 'typescript',
        existingFiles: [],
        dependencies: [],
        projectStructure: []
      }
    }
    
    console.log('🚀 Testing code generation...')
    const result = await aiManager.generateCode(request)
    
    if (result.success) {
      console.log('✅ Code generation successful!')
      console.log('📁 Generated files:', result.files.length)
      console.log('🔧 Provider used:', result.provider)
      console.log('📊 Usage:', result.usage)
    } else {
      console.log('❌ Code generation failed:', result.error)
    }
    
    // Test metrics
    const metrics = aiManager.getMetrics()
    console.log('📈 Current metrics:', {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      providerUsage: metrics.providerUsage
    })
    
    console.log('🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAIServiceManager()
}

export { testAIServiceManager }