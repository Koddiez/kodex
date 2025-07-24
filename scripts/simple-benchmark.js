const { performance } = require('perf_hooks');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const { v4: uuidv4 } = require('uuid');
const { createAuthService } = require('./mock-auth');
const os = require('os');

// Add color support for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to format time
function formatTime(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// Configuration
const CONFIG = {
  iterations: 100,
  outputDir: join(__dirname, '..', 'benchmark-results'),
};

// Ensure output directory exists
if (!existsSync(CONFIG.outputDir)) {
  mkdirSync(CONFIG.outputDir, { recursive: true });
}

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
  role: 'user',
};

// Benchmark function
async function runBenchmark(name, fn, iterations = CONFIG.iterations) {
  console.log(`\n${colors.blue}${colors.bright}🚀 Running benchmark: ${name}${colors.reset}`);
  console.log(`${colors.dim}  Iterations: ${formatNumber(iterations)}${colors.reset}`);
  
  const times = [];
  let error = null;
  let progressInterval;
  
  try {
    // Show progress for benchmarks with many iterations
    if (iterations > 10) {
      let completed = 0;
      const totalBars = 30;
      
      process.stdout.write(`  ${colors.dim}[${' '.repeat(totalBars)}] 0%`);
      
      progressInterval = setInterval(() => {
        const progress = Math.min(completed / iterations, 1);
        const filledBars = Math.round(progress * totalBars);
        const emptyBars = totalBars - filledBars;
        
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(
          `  ${colors.dim}[${'█'.repeat(filledBars)}${' '.repeat(emptyBars)}] ` +
          `${Math.round(progress * 100)}% (${formatNumber(completed)}/${formatNumber(iterations)})`
        );
      }, 100);
    }
    
    // Warm-up
    try {
      await fn(0);
    } catch (warmupError) {
      console.error(`\n${colors.red}❌ Warm-up failed: ${warmupError.message}${colors.reset}`);
      throw warmupError;
    }
    
    // Run benchmark
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      try {
        const iterStart = performance.now();
        await fn(i);
        const iterEnd = performance.now();
        times.push(iterEnd - iterStart);
        
        if (progressInterval) {
          // Update progress
          const progress = (i + 1) / iterations;
          const filledBars = Math.round(progress * 30);
          const emptyBars = 30 - filledBars;
          
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(
            `  ${colors.dim}[${'█'.repeat(filledBars)}${' '.repeat(emptyBars)}] ` +
            `${Math.round(progress * 100)}% (${i + 1}/${iterations})`
          );
        }
      } catch (iterError) {
        console.error(`\n${colors.red}❌ Iteration ${i + 1} failed: ${iterError.message}${colors.reset}`);
        throw iterError;
      }
    }
    
    // Clear progress interval if it exists
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;
    
    // Calculate percentiles
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    // Calculate standard deviation
    const squareDiffs = times.map(t => Math.pow(t - avgTime, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, d) => sum + d, 0) / times.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    const result = {
      name,
      iterations: times.length, // Use actual successful iterations
      totalTime,
      avgTime,
      minTime,
      maxTime,
      p50,
      p90,
      p99,
      stdDev,
      opsPerSecond,
      times,
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
    
    // Format and log results
    console.log(`${colors.green}${colors.bright}✅ Completed in ${formatTime(totalTime)}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Iterations: ${colors.bright}${formatNumber(times.length)}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Avg: ${colors.bright}${formatTime(avgTime)}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Min/Max: ${colors.bright}${formatTime(minTime)}${colors.reset} / ${colors.bright}${formatTime(maxTime)}${colors.reset}`);
    console.log(`  ${colors.cyan}•${colors.reset} Percentiles: P50=${formatTime(p50)}, P90=${formatTime(p90)}, P99=${formatTime(p99)}`);
    console.log(`  ${colors.cyan}•${colors.reset} Std Dev: ${formatTime(stdDev)} (${(stdDev / avgTime * 100).toFixed(1)}% of mean)`);
    console.log(`  ${colors.cyan}•${colors.reset} Ops/sec: ${colors.bright}${Math.round(opsPerSecond).toLocaleString()}${colors.reset}`);
    
    return { result, error: null };
  } catch (err) {
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }
    
    console.error(`\n${colors.red}${colors.bright}❌ Benchmark failed: ${err.message}${colors.reset}`);
    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(err.stack);
    }
    return { result: null, error: err };
  }
}

// Benchmark scenarios
const benchmarks = [
  {
    name: 'User Registration',
    fn: async (i) => {
      const email = `test-${i}-${uuidv4()}@example.com`;
      await authService.register({
        name: `User ${i}`,
        email,
        password: 'password123!',
        role: 'user'
      });
    },
    iterations: 20 // Fewer iterations for registration
  },
  {
    name: 'User Login',
    setup: async () => {
      // Ensure test user exists
      const email = `test-${uuidv4()}@example.com`;
      await authService.register({
        name: 'Test User',
        email,
        password: 'password123!',
        role: 'user'
      });
      return { email };
    },
    fn: async (i, { email }) => {
      await authService.login(email, 'password123!', { ip: '127.0.0.1' });
    },
    iterations: 100
  },
  {
    name: 'Token Validation',
    setup: async () => {
      // Create a user and get a token
      const email = `test-${uuidv4()}@example.com`;
      await authService.register({
        name: 'Test User',
        email,
        password: 'password123!',
        role: 'user'
      });
      const { token } = await authService.login(email, 'password123!', { ip: '127.0.0.1' });
      return { token };
    },
    fn: async (i, { token }) => {
      await authService.validateToken(token);
    },
    iterations: 1000
  }
];

// Get system information
function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: formatBytes(os.totalmem()),
    freeMemory: formatBytes(os.freemem()),
    loadAvg: os.loadavg().map(load => load.toFixed(2)),
    uptime: formatTime(os.uptime() * 1000),
    hostname: os.hostname(),
    timestamp: new Date().toISOString()
  };
}

// Format bytes to human-readable string
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Main function
async function main() {
  console.log(`\n${colors.blue}${colors.bright}🚀 Kodex Performance Benchmarks${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  
  // Display system information
  const systemInfo = getSystemInfo();
  console.log(`\n${colors.cyan}${colors.bright}System Information:${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Platform: ${systemInfo.platform} (${systemInfo.arch})`);
  console.log(`  ${colors.cyan}•${colors.reset} Node.js: ${systemInfo.nodeVersion}`);
  console.log(`  ${colors.cyan}•${colors.reset} CPU: ${systemInfo.cpus} cores`);
  console.log(`  ${colors.cyan}•${colors.reset} Memory: ${systemInfo.freeMemory} free of ${systemInfo.totalMemory}`);
  console.log(`  ${colors.cyan}•${colors.reset} Load: ${systemInfo.loadAvg.join(', ')} (1, 5, 15 min)`);
  console.log(`  ${colors.cyan}•${colors.reset} Uptime: ${systemInfo.uptime}`);
  console.log(`  ${colors.cyan}•${colors.reset} Hostname: ${systemInfo.hostname}`);
  console.log(`  ${colors.cyan}•${colors.reset} Timestamp: ${systemInfo.timestamp}`);
  
  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);
  
  const results = [];
  
  for (const benchmark of benchmarks) {
    let context = {};
    
    // Run setup if provided
    if (benchmark.setup) {
      console.log(`\n⚙️  Setting up benchmark: ${benchmark.name}`);
      context = await benchmark.setup();
    }
    
    // Run benchmark
    const { result, error } = await runBenchmark(
      benchmark.name,
      (i) => benchmark.fn(i, context),
      benchmark.iterations || CONFIG.iterations
    );
    
    if (result) {
      results.push(result);
      
      // Save individual benchmark result
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('+')[0];
      
      const filename = join(
        CONFIG.outputDir,
        `benchmark-${benchmark.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`
      );
      
      writeFileSync(filename, JSON.stringify(result, null, 2), 'utf8');
      console.log(`📊 Results saved to: ${filename}`);
    }
  }
  
  // Generate summary report
  if (results.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('+')[0];
    
    const summary = {
      timestamp: new Date().toISOString(),
      system: systemInfo,
      benchmarks: results.map(r => ({
        name: r.name,
        iterations: r.iterations,
        totalTime: r.totalTime,
        avgTime: r.avgTime,
        minTime: r.minTime,
        maxTime: r.maxTime,
        p50: r.p50,
        p90: r.p90,
        p99: r.p99,
        stdDev: r.stdDev,
        opsPerSecond: r.opsPerSecond,
        stdDevPct: (r.stdDev / r.avgTime * 100).toFixed(1) + '%'
      }))
    };
    
    const summaryFile = join(CONFIG.outputDir, `benchmark-summary-${timestamp}.json`);
    writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
    
    // Generate markdown report
    let markdown = `# Kodex Performance Benchmark Results\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // System information
    markdown += '## System Information\n\n';
    markdown += '| Metric | Value |\n|--------|-------|\n';
    markdown += `| Platform | ${systemInfo.platform} (${systemInfo.arch}) |\n`;
    markdown += `| Node.js | ${systemInfo.nodeVersion} |\n`;
    markdown += `| CPU | ${systemInfo.cpus} cores |\n`;
    markdown += `| Memory | ${systemInfo.freeMemory} free of ${systemInfo.totalMemory} |\n`;
    markdown += `| Load Avg | ${systemInfo.loadAvg.join(', ')} (1, 5, 15 min) |\n`;
    markdown += `| Uptime | ${systemInfo.uptime} |\n`;
    markdown += `| Hostname | ${systemInfo.hostname} |\n\n`;
    
    // Benchmark results
    markdown += '## Benchmark Results\n\n';
    markdown += '| Benchmark | Iterations | Avg | Min | Max | P50 | P90 | P99 | Ops/sec | Std Dev |\n';
    markdown += '|-----------|------------|-----|-----|-----|-----|-----|-----|---------|---------|\n';
    
    for (const b of summary.benchmarks) {
      markdown += `| ${b.name} | ${b.iterations.toLocaleString()} | `;
      markdown += `${formatTime(b.avgTime)} | ${formatTime(b.minTime)} | ${formatTime(b.maxTime)} | `;
      markdown += `${formatTime(b.p50)} | ${formatTime(b.p90)} | ${formatTime(b.p99)} | `;
      markdown += `${Math.round(b.opsPerSecond).toLocaleString()}/s | ${b.stdDevPct} |\n`;
    }
    
    markdown += '\n## Detailed Results\n\n';
    
    for (const b of summary.benchmarks) {
      markdown += `### ${b.name}\n\n`;
      markdown += `- **Iterations:** ${b.iterations.toLocaleString()}\n`;
      markdown += `- **Total Time:** ${formatTime(b.totalTime)}\n`;
      markdown += `- **Avg Time:** ${formatTime(b.avgTime)}\n`;
      markdown += `- **Min/Max Time:** ${formatTime(b.minTime)} / ${formatTime(b.maxTime)}\n`;
      markdown += `- **Percentiles:** P50=${formatTime(b.p50)}, P90=${formatTime(b.p90)}, P99=${formatTime(b.p99)}\n`;
      markdown += `- **Operations/sec:** ${Math.round(b.opsPerSecond).toLocaleString()}\n`;
      markdown += `- **Std Dev:** ${formatTime(b.stdDev)} (${b.stdDevPct} of mean)\n\n`;
    }
    
    const markdownFile = join(CONFIG.outputDir, `benchmark-report-${timestamp}.md`);
    writeFileSync(markdownFile, markdown, 'utf8');
    
    // Display summary
    console.log(`\n${colors.green}${colors.bright}📊 Benchmark Summary${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(80)}${colors.reset}`);
    
    // Find max name length for formatting
    const maxNameLength = Math.max(...results.map(r => r.name.length));
    
    // Table header
    console.log(
      `${colors.cyan}${'Benchmark'.padEnd(maxNameLength)}${colors.reset} | ` +
      `${'Ops/sec'.padStart(10)} | ` +
      `${'Avg'.padStart(10)} | ` +
      `${'Min'.padStart(10)} | ` +
      `${'Max'.padStart(10)} | ` +
      `${'P99'.padStart(10)} | ` +
      `${'Std Dev'.padStart(10)}`
    );
    
    // Table separator
    console.log(`${'-'.repeat(maxNameLength)}-+-${'-'.repeat(11)}-+-${'-'.repeat(11)}-+-${'-'.repeat(11)}-+-${'-'.repeat(11)}-+-${'-'.repeat(11)}`);
    
    // Table rows
    for (const b of summary.benchmarks) {
      const row = [
        `${colors.cyan}${b.name.padEnd(maxNameLength)}${colors.reset}`,
        `${colors.green}${Math.round(b.opsPerSecond).toLocaleString().padStart(10)}${colors.reset}`,
        `${formatTime(b.avgTime).padStart(10)}`,
        `${formatTime(b.minTime).padStart(10)}`,
        `${formatTime(b.maxTime).padStart(10)}`,
        `${formatTime(b.p99).padStart(10)}`,
        `${b.stdDevPct.padStart(10)}`
      ];
      console.log(row.join(' | '));
    }
    
    console.log(`\n${colors.green}${'='.repeat(80)}${colors.reset}`);
    console.log(`\n📊 ${colors.bright}Benchmark reports:${colors.reset}`);
    console.log(`  • JSON Summary: ${colors.cyan}${summaryFile}${colors.reset}`);
    console.log(`  • Markdown Report: ${colors.cyan}${markdownFile}${colors.reset}`);
  }
  
  console.log('\n🏁 All benchmarks completed!');
}

// Run benchmarks
main().catch(err => {
  console.error('\n❌ Error running benchmarks:', err);
  process.exit(1);
});
