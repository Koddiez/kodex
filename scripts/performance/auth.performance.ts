const { runBenchmarks, formatBenchmarkResults } = require('./benchmark');
const { createAuthService } = require('../../src/collaboration/auth');
const { v4: uuidv4 } = require('uuid');
const { writeFileSync } = require('fs');
const { join } = require('path');

// Mock the logger if needed
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Initialize auth service
const authService = createAuthService({
  secretKey: 'test-secret-key-for-benchmarking',
  tokenExpiration: 3600,
  sessionExpiration: 86400,
  requireEmailVerification: false,
});

// Test user data
const TEST_USER = {
  name: 'Test User',
  email: `test-${uuidv4()}@example.com`,
  password: 'secure-password-123!',
  role: 'user' as const,
};

// Test token for validation
let testToken: string;

/**
 * Register a new user benchmark
 */
async function benchmarkRegister() {
  const email = `test-${uuidv4()}@example.com`;
  await authService.register({
    ...TEST_USER,
    email,
  });
}

/**
 * Login benchmark
 */
async function benchmarkLogin() {
  const { token } = await authService.login(
    TEST_USER.email,
    TEST_USER.password,
    { ip: '127.0.0.1' }
  );
  
  // Store token for validation benchmark
  testToken = token;
}

/**
 * Token validation benchmark
 */
async function benchmarkValidateToken() {
  if (!testToken) {
    throw new Error('No token available for validation');
  }
  
  await authService.validateToken(testToken);
}

/**
 * Get user sessions benchmark
 */
async function benchmarkGetUserSessions() {
  if (!testToken) {
    throw new Error('No token available');
  }
  
  const result = await authService.validateToken(testToken);
  if (!result) {
    throw new Error('Token validation failed');
  }
  
  authService.getUserSessions(result.user.id);
}

/**
 * Password reset flow benchmark
 */
async function benchmarkPasswordReset() {
  const email = `reset-${uuidv4()}@example.com`;
  
  // Register a test user
  await authService.register({
    ...TEST_USER,
    email,
  });
  
  // Request password reset
  await authService.requestPasswordReset(email);
  
  // In a real scenario, we would extract the reset token from the email
  // For testing, we'll use a mock token
  const resetToken = 'mock-reset-token';
  const newPassword = 'new-secure-password-123!';
  
  // Reset password
  await authService.resetPassword(resetToken, newPassword);
}

/**
 * Run all auth benchmarks
 */
async function runAuthBenchmarks() {
  console.log('🚀 Running authentication service benchmarks...');
  
  // Register a test user first
  await authService.register(TEST_USER);
  
  // Run benchmarks
  const results = await runBenchmarks(
    [
      {
        name: 'User Registration',
        fn: benchmarkRegister,
        config: {
          iterations: 100,
          gc: true,
        },
      },
      {
        name: 'User Login',
        fn: benchmarkLogin,
        config: {
          iterations: 1000,
          gc: true,
        },
      },
      {
        name: 'Token Validation',
        fn: benchmarkValidateToken,
        config: {
          iterations: 5000,
          gc: true,
        },
      },
      {
        name: 'Get User Sessions',
        fn: benchmarkGetUserSessions,
        config: {
          iterations: 1000,
          gc: true,
        },
      },
      {
        name: 'Password Reset Flow',
        fn: benchmarkPasswordReset,
        config: {
          iterations: 50,
          gc: true,
        },
      },
    ],
    {
      outputDir: './benchmark-results/auth',
    }
  );
  
  // Format results as markdown
  const markdown = formatBenchmarkResults(results, {
    includeHeader: true,
    includeSummary: true,
  });
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = join(__dirname, '..', '..', 'benchmark-results', `auth-benchmark-${timestamp}.md`);
  
  writeFileSync(outputFile, markdown, 'utf8');
  console.log(`\n📊 Benchmark results saved to: ${outputFile}`);
  
  return results;
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runAuthBenchmarks().catch(error => {
    console.error('Error running auth benchmarks:', error);
    process.exit(1);
  });
}

export { runAuthBenchmarks };
