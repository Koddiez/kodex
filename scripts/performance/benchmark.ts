import { performance, PerformanceObserver } from 'perf_hooks';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Declare global for garbage collection
declare const global: typeof globalThis & {
  gc?: () => void;
};

/**
 * Performance measurement configuration
 */
interface BenchmarkConfig {
  /**
   * Name of the benchmark
   */
  name: string;
  
  /**
   * Number of iterations to run
   * @default 100
   */
  iterations?: number;
  
  /**
   * Whether to run garbage collection between tests
   * @default true
   */
  gc?: boolean;
  
  /**
   * Timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;
  
  /**
   * Output directory for benchmark results
   * @default './benchmark-results'
   */
  outputDir?: string;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  /**
   * Name of the benchmark
   */
  name: string;
  
  /**
   * Number of iterations
   */
  iterations: number;
  
  /**
   * Total execution time in milliseconds
   */
  totalTime: number;
  
  /**
   * Average execution time per iteration in milliseconds
   */
  averageTime: number;
  
  /**
   * Operations per second
   */
  opsPerSecond: number;
  
  /**
   * Minimum execution time in milliseconds
   */
  minTime: number;
  
  /**
   * Maximum execution time in milliseconds
   */
  maxTime: number;
  
  /**
   * Standard deviation of execution times
   */
  stdDev: number;
  
  /**
   * Memory usage in MB
   */
  memory: {
    /**
     * Heap used in MB
     */
    heapUsed: number;
    
    /**
     * Heap total in MB
     */
    heapTotal: number;
    
    /**
     * External memory in MB
     */
    external: number;
    
    /**
     * Array buffers in MB
     */
    arrayBuffers: number;
  };
  
  /**
   * Node.js version
   */
  nodeVersion: string;
  
  /**
   * Platform information
   */
  platform: {
    /**
     * OS platform
     */
    platform: string;
    
    /**
     * CPU architecture
     */
    arch: string;
    
    /**
     * Number of CPU cores
     */
    cpus: number;
    
    /**
     * Total system memory in GB
     */
    totalMemory: number;
  };
  
  /**
   * Timestamp of when the benchmark was run
   */
  timestamp: string;
  
  /**
   * Individual iteration times in milliseconds
   */
  iterationTimes: number[];
}

/**
 * Run garbage collection (if available)
 */
async function runGarbageCollection() {
  if (global.gc) {
    global.gc();
    // Wait for GC to complete
    await new Promise(resolve => setImmediate(resolve));
  }
}

/**
 * Get memory usage in MB
 */
function getMemoryUsage() {
  const memory = process.memoryUsage();
  
  return {
    heapUsed: memory.heapUsed / 1024 / 1024,
    heapTotal: memory.heapTotal / 1024 / 1024,
    external: memory.external ? memory.external / 1024 / 1024 : 0,
    arrayBuffers: memory.arrayBuffers ? memory.arrayBuffers / 1024 / 1024 : 0,
  };
}

/**
 * Calculate statistics from an array of numbers
 */
function calculateStats(times: number[]) {
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  // Calculate standard deviation
  const squareDiffs = times.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / times.length;
  const stdDev = Math.sqrt(avgSquareDiff);
  
  return {
    sum,
    avg,
    min,
    max,
    stdDev,
  };
}

/**
 * Get system information
 */
async function getSystemInfo() {
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const cpus = require('os').cpus().length;
  const totalMemory = require('os').totalmem() / 1024 / 1024 / 1024; // GB
  
  return {
    nodeVersion,
    platform: {
      platform,
      arch,
      cpus,
      totalMemory,
    },
  };
}

/**
 * Run a benchmark
 * @param fn Function to benchmark
 * @param config Benchmark configuration
 */
export async function benchmark(
  fn: () => void | Promise<void>,
  config: BenchmarkConfig
): Promise<BenchmarkResult> {
  const {
    name,
    iterations = 100,
    gc = true,
    timeout = 30000,
    outputDir = './benchmark-results',
  } = config;
  
  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Set up timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(`Benchmark "${name}" timed out after ${timeout}ms`));
    }, timeout);
  });
  
  // Run garbage collection before starting
  if (gc) {
    await runGarbageCollection();
  }
  
  const startMemory = getMemoryUsage();
  const iterationTimes: number[] = [];
  
  // Warm-up run
  try {
    await Promise.race([
      Promise.resolve(fn()),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error(`Error during warm-up: ${error.message}`);
    throw error;
  }
  
  // Main benchmark loop
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Run garbage collection between iterations if enabled
    if (gc && i > 0) {
      await runGarbageCollection();
    }
    
    const iterStart = performance.now();
    
    try {
      await Promise.race([
        Promise.resolve(fn()),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error(`Error during iteration ${i + 1}: ${error.message}`);
      throw error;
    }
    
    const iterEnd = performance.now();
    iterationTimes.push(iterEnd - iterStart);
  }
  
  const endTime = performance.now();
  const endMemory = getMemoryUsage();
  
  // Calculate statistics
  const stats = calculateStats(iterationTimes);
  const totalTime = endTime - startTime;
  const averageTime = stats.avg;
  const opsPerSecond = 1000 / averageTime;
  
  // Get system info
  const systemInfo = await getSystemInfo();
  
  // Prepare result
  const result: BenchmarkResult = {
    name,
    iterations,
    totalTime,
    averageTime,
    opsPerSecond,
    minTime: stats.min,
    maxTime: stats.max,
    stdDev: stats.stdDev,
    memory: {
      heapUsed: endMemory.heapUsed,
      heapTotal: endMemory.heapTotal,
      external: endMemory.external,
      arrayBuffers: endMemory.arrayBuffers,
    },
    nodeVersion: systemInfo.nodeVersion,
    platform: systemInfo.platform,
    timestamp: new Date().toISOString(),
    iterationTimes,
  };
  
  // Save results to file
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = join(outputDir, `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`);
  
  writeFileSync(filename, JSON.stringify(result, null, 2), 'utf8');
  
  return result;
}

/**
 * Run multiple benchmarks in sequence
 * @param benchmarks Array of benchmark configurations
 */
export async function runBenchmarks(
  benchmarks: Array<{
    name: string;
    fn: () => void | Promise<void>;
    config?: Partial<BenchmarkConfig>;
  }>,
  commonConfig: Partial<BenchmarkConfig> = {}
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  for (const { name, fn, config = {} } of benchmarks) {
    console.log(`\nRunning benchmark: ${name}`);
    
    const startTime = Date.now();
    const result = await benchmark(fn, {
      name,
      ...commonConfig,
      ...config,
    });
    
    const duration = (Date.now() - startTime) / 1000; // seconds
    
    console.log(`✅ Completed in ${duration.toFixed(2)}s`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Average time: ${result.averageTime.toFixed(4)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
    console.log(`  Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms`);
    console.log(`  Std Dev: ${result.stdDev.toFixed(4)}ms`);
    console.log(`  Memory: ${result.memory.heapUsed.toFixed(2)}MB used of ${result.memory.heapTotal.toFixed(2)}MB`);
    
    results.push(result);
  }
  
  return results;
}

/**
 * Compare benchmark results
 * @param current Current benchmark result
 * @param baseline Baseline benchmark result to compare against
 * @param threshold Percentage threshold for regression detection (default: 10%)
 */
export function compareBenchmarkResults(
  current: BenchmarkResult,
  baseline: BenchmarkResult,
  threshold = 10
): {
  isRegression: boolean;
  regressions: string[];
  improvements: string[];
  metrics: Array<{
    name: string;
    current: number;
    baseline: number;
    diff: number;
    diffPercent: number;
    isRegression: boolean;
  }>;
} {
  const metrics = [
    {
      name: 'averageTime',
      current: current.averageTime,
      baseline: baseline.averageTime,
    },
    {
      name: 'opsPerSecond',
      current: current.opsPerSecond,
      baseline: baseline.opsPerSecond,
    },
    {
      name: 'memory.heapUsed',
      current: current.memory.heapUsed,
      baseline: baseline.memory.heapUsed,
    },
  ];
  
  const result = {
    isRegression: false,
    regressions: [] as string[],
    improvements: [] as string[],
    metrics: metrics.map(({ name, current, baseline }) => {
      const diff = current - baseline;
      const diffPercent = (Math.abs(diff) / baseline) * 100;
      const isRegression = name === 'averageTime' || name === 'memory.heapUsed' 
        ? diff > (baseline * threshold) / 100
        : name === 'opsPerSecond'
        ? diff < -(baseline * threshold) / 100
        : false;
      
      if (isRegression) {
        result.isRegression = true;
        result.regressions.push(`${name} regressed by ${diffPercent.toFixed(2)}%`);
      } else if (diffPercent > threshold) {
        result.improvements.push(`${name} improved by ${diffPercent.toFixed(2)}%`);
      }
      
      return {
        name,
        current,
        baseline,
        diff,
        diffPercent,
        isRegression,
      };
    }),
  };
  
  return result;
}

/**
 * Format benchmark results as a markdown table
 */
export function formatBenchmarkResults(
  results: BenchmarkResult[],
  options: {
    includeHeader?: boolean;
    includeSummary?: boolean;
    formatNumbers?: boolean;
  } = {}
): string {
  const {
    includeHeader = true,
    includeSummary = true,
    formatNumbers = true,
  } = options;
  
  const formatNumber = (value: number, decimals = 2) => {
    if (!formatNumbers) return value.toString();
    
    if (value >= 1000) {
      return value.toFixed(0);
    } else if (value >= 100) {
      return value.toFixed(1);
    } else if (value >= 1) {
      return value.toFixed(2);
    } else if (value >= 0.001) {
      return value.toFixed(4);
    } else {
      return value.toExponential(2);
    }
  };
  
  const rows: string[][] = [];
  
  // Header
  if (includeHeader) {
    rows.push([
      'Benchmark',
      'Iterations',
      'Avg (ms)',
      'Ops/sec',
      'Min (ms)',
      'Max (ms)',
      'Std Dev',
      'Heap (MB)',
    ]);
    
    rows.push(Array(8).fill('---'));
  }
  
  // Data rows
  for (const result of results) {
    rows.push([
      result.name,
      result.iterations.toString(),
      formatNumber(result.averageTime),
      formatNumber(result.opsPerSecond),
      formatNumber(result.minTime),
      formatNumber(result.maxTime),
      formatNumber(result.stdDev, 4),
      `${formatNumber(result.memory.heapUsed)} / ${formatNumber(result.memory.heapTotal)}`,
    ]);
  }
  
  // Calculate column widths
  const colWidths = rows[0].map((_, colIndex) => {
    return Math.max(...rows.map(row => row[colIndex].length));
  });
  
  // Format rows
  const formattedRows = rows.map(row => {
    return '| ' + row.map((cell, i) => {
      return cell.padEnd(colWidths[i]);
    }).join(' | ') + ' |';
  });
  
  let output = formattedRows.join('\n');
  
  // Add summary
  if (includeSummary && results.length > 1) {
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgOpsPerSec = results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length;
    const totalMemory = results.reduce((sum, r) => sum + r.memory.heapUsed, 0);
    
    output += '\n\n';
    output += '**Summary**\n\n';
    output += `- Total benchmark time: ${(totalTime / 1000).toFixed(2)}s\n`;
    output += `- Average operations per second: ${avgOpsPerSec.toFixed(2)}\n`;
    output += `- Total memory used: ${(totalMemory / 1024).toFixed(2)}GB\n`;
  }
  
  return output;
}

/**
 * Run benchmarks from the command line
 */
async function main() {
  // Example usage
  if (process.argv.includes('--example')) {
    console.log('Running example benchmarks...');
    
    await runBenchmarks([
      {
        name: 'Array.map',
        fn: () => {
          const arr = Array(1000).fill(0).map((_, i) => i);
          return arr.map(x => x * 2);
        },
        config: {
          iterations: 1000,
        },
      },
      {
        name: 'Array.forEach',
        fn: () => {
          const arr = Array(1000).fill(0).map((_, i) => i);
          const result: number[] = [];
          arr.forEach(x => result.push(x * 2));
          return result;
        },
        config: {
          iterations: 1000,
        },
      },
    ], {
      outputDir: './benchmark-results/examples',
    });
    
    return;
  }
  
  console.log('No benchmarks specified. Use --example to run example benchmarks.');
  console.log('\nUsage:');
  console.log('  npx ts-node benchmark.ts --example');
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  });
}
