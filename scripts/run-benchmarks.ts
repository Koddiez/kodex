#!/usr/bin/env node

/**
 * Kodex Performance Benchmark Runner
 * 
 * This script runs all performance benchmarks and generates a comprehensive report.
 * It can be run with specific benchmark targets or all benchmarks.
 */

import { program } from 'commander';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Benchmark modules
const BENCHMARKS = {
  auth: () => import('./performance/auth.performance.js').then(m => m.runAuthBenchmarks()),
  websocket: () => import('./performance/websocket.performance.js').then(m => m.runWebSocketBenchmarks()),
  // Add more benchmarks here as they are created
};

type BenchmarkName = keyof typeof BENCHMARKS;

// Configuration
const CONFIG = {
  outputDir: join(__dirname, '..', 'benchmark-results'),
  timestamp: format(new Date(), 'yyyy-MM-dd_HH-mm-ss'),
};

// Ensure output directory exists
if (!existsSync(CONFIG.outputDir)) {
  mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get memory usage
 */
function getMemoryUsage() {
  const memory = process.memoryUsage();
  
  return {
    rss: formatBytes(memory.rss),
    heapTotal: formatBytes(memory.heapTotal),
    heapUsed: formatBytes(memory.heapUsed),
    external: formatBytes(memory.external || 0),
    arrayBuffers: formatBytes(memory.arrayBuffers || 0),
  };
}

/**
 * Run a single benchmark
 */
async function runBenchmark(name: BenchmarkName) {
  console.log(`\n${chalk.blue('▶')} Running ${chalk.bold(name)} benchmark...`);
  
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    // Run the benchmark
    const results = await BENCHMARKS[name]();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = (endTime - startTime) / 1000; // seconds
    
    // Calculate memory usage
    const memoryUsage = {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: (endMemory.external || 0) - (startMemory.external || 0),
    };
    
    console.log(`  ${chalk.green('✓')} Completed in ${duration.toFixed(2)}s`);
    console.log(`  Memory usage: ${formatBytes(memoryUsage.heapUsed)} (Δ)`);
    
    return {
      name,
      success: true,
      duration,
      memoryUsage,
      results,
    };
  } catch (error) {
    console.error(`  ${chalk.red('✗')} Failed: ${error.message}`);
    
    return {
      name,
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * Generate a markdown report from benchmark results
 */
function generateReport(results: any[], timestamp: string): string {
  let report = `# Kodex Performance Benchmark Report\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Summary section
  report += '## 📊 Summary\n\n';
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = (successCount / totalCount) * 100;
  
  report += `- **Total Benchmarks:** ${totalCount}\n`;
  report += `- **Successful:** ${successCount} (${successRate.toFixed(1)}%)\n`;
  report += `- **Failed:** ${totalCount - successCount}\n\n`;
  
  // Individual benchmark results
  report += '## 📈 Benchmark Results\n\n';
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    report += `### ${status} ${result.name}\n\n`;
    
    if (result.success) {
      report += `- **Duration:** ${result.duration.toFixed(2)}s\n`;
      report += `- **Memory Usage:** ${formatBytes(result.memoryUsage.heapUsed)} (Δ)\n\n`;
      
      // Add detailed results if available
      if (Array.isArray(result.results)) {
        report += '#### Detailed Metrics\n\n';
        report += '| Metric | Value |\n|--------|-------|\n';
        
        for (const metric of result.results) {
          report += `| ${metric.name} | ${metric.value} |\n`;
        }
        
        report += '\n';
      }
    } else {
      report += `**Error:** ${result.error}\n\n`;
      if (result.stack) {
        report += '```\n';
        report += result.stack;
        report += '\n```\n\n';
      }
    }
  }
  
  // System information
  report += '## 🖥️ System Information\n\n';
  report += '```\n';
  report += `Node.js: ${process.version}\n`;
  report += `Platform: ${process.platform} (${process.arch})\n`;
  report += `CPU: ${require('os').cpus().length} cores\n`;
  report += `Memory: ${formatBytes(require('os').totalmem())} total\n`;
  report += '```\n\n';
  
  // Footer
  report += '---\n';
  report += `_Report generated by Kodex Benchmark Runner at ${new Date().toISOString()}_\n`;
  
  return report;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  program
    .name('benchmark')
    .description('Run Kodex performance benchmarks')
    .option('-a, --all', 'run all benchmarks')
    .option('-l, --list', 'list available benchmarks')
    .option('-o, --output <file>', 'output file for the report')
    .argument('[benchmarks...]', 'benchmarks to run')
    .parse(process.argv);
  
  const options = program.opts();
  const args = program.args as BenchmarkName[];
  
  // List available benchmarks
  if (options.list) {
    console.log('\nAvailable benchmarks:');
    console.log(Object.keys(BENCHMARKS).map(name => `  - ${name}`).join('\n'));
    return;
  }
  
  // Determine which benchmarks to run
  let benchmarksToRun: BenchmarkName[] = [];
  
  if (options.all) {
    benchmarksToRun = Object.keys(BENCHMARKS) as BenchmarkName[];
  } else if (args.length > 0) {
    // Validate benchmark names
    const invalid = args.filter(name => !BENCHMARKS[name as BenchmarkName]);
    
    if (invalid.length > 0) {
      console.error(`\n${chalk.red('Error:')} Invalid benchmark(s): ${invalid.join(', ')}`);
      console.log('\nAvailable benchmarks:');
      console.log(Object.keys(BENCHMARKS).map(name => `  - ${name}`).join('\n'));
      process.exit(1);
    }
    
    benchmarksToRun = args as BenchmarkName[];
  } else {
    // Default: run all benchmarks
    benchmarksToRun = Object.keys(BENCHMARKS) as BenchmarkName[];
  }
  
  if (benchmarksToRun.length === 0) {
    console.error('\nNo benchmarks to run.');
    process.exit(1);
  }
  
  console.log(`\n🚀 Running ${chalk.bold(benchmarksToRun.length)} benchmark(s):`);
  console.log(`  ${benchmarksToRun.join(', ')}\n`);
  
  // Run benchmarks sequentially
  const results = [];
  
  for (const name of benchmarksToRun) {
    const result = await runBenchmark(name);
    results.push(result);
  }
  
  // Generate report
  const report = generateReport(results, CONFIG.timestamp);
  
  // Determine output file
  let outputFile = options.output;
  if (!outputFile) {
    outputFile = join(CONFIG.outputDir, `benchmark-report-${CONFIG.timestamp}.md`);
  }
  
  // Ensure directory exists
  const outputDir = dirname(outputFile);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Write report to file
  writeFileSync(outputFile, report, 'utf8');
  
  // Print summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n${chalk.bold('📊 Benchmark Summary:')}`);
  console.log(`  - Total: ${totalCount}`);
  console.log(`  - ${chalk.green(`Success: ${successCount}`)}`);
  
  if (successCount < totalCount) {
    console.log(`  - ${chalk.red(`Failed: ${totalCount - successCount}`)}`);
  }
  
  console.log(`\n📝 Report generated: ${chalk.underline(outputFile)}`);
}

// Run the main function
main().catch(error => {
  console.error('\n' + chalk.red('❌ Error running benchmarks:'));
  console.error(error);
  process.exit(1);
});
