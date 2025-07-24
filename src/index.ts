import { AIOrchestrator } from './ai/orchestrator';
import { ContextSelector } from './context/selector';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { analyzeDependencies } from './dependency/graph';

// Load environment variables
dotenv.config();

// Type definitions for AI service
interface AIServiceProvider {
  generateCode(request: CodeGenerationRequest): Promise<{ code: string }>;
}

interface CodeGenerationRequest {
  prompt: string;
  context?: {
    files?: string[];
    language?: string;
    framework?: string;
  };
  maxTokens?: number;
  temperature?: number;
}

async function main() {
  try {
    // Initialize context selector
    console.log('Initializing context selector...');
    const contextSelector = new ContextSelector(process.cwd());
    await contextSelector.initialize();

    // Initialize AI providers
    console.log('Initializing AI providers...');
    const orchestrator = new AIOrchestrator({ maxParallel: 3 });
    
    if (process.env.OPENAI_API_KEY) {
      orchestrator.registerProvider(
        'openai', 
        new OpenAIProvider(process.env.OPENAI_API_KEY),
        0.00002 // Cost per token
      );
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      orchestrator.registerProvider(
        'claude',
        new ClaudeProvider(process.env.ANTHROPIC_API_KEY),
        0.000015 // Cost per token
      );
    }

    // Example usage
    const activeFile = path.join(process.cwd(), 'src/example/UserProfile.tsx');
    console.log(`Analyzing context for: ${activeFile}`);
    
    // Get relevant files for context
    const relevantFiles = await contextSelector.getRelevantFiles(activeFile, 3);
    console.log('Relevant files:', relevantFiles);

    // Generate code with context
    const request: CodeGenerationRequest = {
      prompt: 'Create a React component for user profile with avatar, name, and bio',
      context: {
        files: relevantFiles.map(f => f.filePath),
        language: 'typescript',
        framework: 'react',
      },
      maxTokens: 1000,
      temperature: 0.7,
    };

    console.log('Generating code...');
    
    // Try with single provider first
    try {
      const result = await orchestrator.generateCode(request);
      console.log(`\nGenerated with ${result.provider}:`);
      console.log('='.repeat(80));
      console.log(result.code);
      console.log('='.repeat(80));
      console.log(`Cost: ${result.metrics.costPerToken * result.code.split(/\s+/).length} credits`);
    } catch (error) {
      console.warn('Single provider failed, trying with fallback...');
      
      // Fall back to parallel generation
      const results = await orchestrator.generateInParallel(request, { count: 2 });
      if (results.length > 0) {
        console.log(`\nGenerated with ${results[0].provider} (fallback):`);
        console.log('='.repeat(80));
        console.log(results[0].code);
        console.log('='.repeat(80));
      } else {
        console.error('All generation attempts failed');
      }
    }

    // Show provider metrics
    console.log('\nProvider Metrics:');
    console.table(
      Object.entries(orchestrator.getAllMetrics()).map(([name, metrics]) => ({
        Provider: name,
        'Success Rate': (metrics.successRate * 100).toFixed(1) + '%',
        'Avg. Response (ms)': Math.round(metrics.avgResponseTime),
        'Cost/token': metrics.costPerToken.toExponential(2),
        'Total Requests': metrics.totalRequests,
        'Error Rate': ((metrics.errorCount / Math.max(1, metrics.totalRequests)) * 100).toFixed(1) + '%',
      }))
    );

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

export {
  AIOrchestrator,
  ContextSelector,
  analyzeDependencies,
};

export type { CodeGenerationRequest, AIServiceProvider };
