import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}