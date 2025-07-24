import { runBenchmarks, formatBenchmarkResults } from './benchmark';
import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { AddressInfo } from 'net';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createAuthService } from '../../src/collaboration/auth';
import { createWSSecurity } from '../../src/collaboration/wsSecurity';

// Configuration
const CONFIG = {
  PORT: 0, // Random port
  MAX_CONNECTIONS: 1000,
  MESSAGES_PER_CONNECTION: 100,
  MESSAGE_INTERVAL_MS: 10,
  BENCHMARK_DURATION_MS: 10000, // 10 seconds
  OUTPUT_DIR: join(__dirname, '..', '..', 'benchmark-results', 'websocket'),
};

// Test data
const TEST_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

const TEST_SESSION = {
  id: 'test-session-1',
  userId: 'test-user-1',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 3600 * 1000),
  metadata: {},
  isActive: true,
};

// Global variables
let server: Server;
let wss: WebSocketServer;
let wsSecurity: ReturnType<typeof createWSSecurity>;
let authService: ReturnType<typeof createAuthService>;
let serverUrl: string;

/**
 * Setup test environment
 */
async function setup() {
  // Create auth service
  authService = createAuthService({
    secretKey: 'test-secret-key-for-benchmarking',
    tokenExpiration: 3600,
    sessionExpiration: 86400,
    requireEmailVerification: false,
  });
  
  // Mock auth service methods
  authService.validateToken = jest.fn().mockResolvedValue({
    user: TEST_USER,
    session: TEST_SESSION,
  });
  
  // Create HTTP server
  server = new Server();
  
  // Create WebSocket server
  wss = new WebSocketServer({ server });
  
  // Apply WebSocket security
  wsSecurity = createWSSecurity(wss, {
    authService,
    maxConnectionsPerIp: CONFIG.MAX_CONNECTIONS * 2,
    maxMessagesPerSecond: 1000,
    requireAuth: true,
    debug: false,
  });
  
  // Start server
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      serverUrl = `ws://localhost:${port}`;
      resolve();
    });
  });
  
  // Simple echo handler for testing
  wss.on('message', ({ ws, message, reply }) => {
    if (message.type === 'echo') {
      reply({
        type: 'echo_response',
        data: message.data,
        timestamp: Date.now(),
      });
    }
  });
}

/**
 * Teardown test environment
 */
async function teardown() {
  // Close all WebSocket connections
  for (const client of wss.clients) {
    client.terminate();
  }
  
  // Close servers
  await new Promise<void>((resolve) => {
    wss.close(() => {
      server.close(() => {
        resolve();
      });
    });
  });
  
  // Clean up WebSocket security
  if (wsSecurity && typeof wsSecurity.cleanup === 'function') {
    wsSecurity.cleanup();
  }
}

/**
 * Create a WebSocket client with authentication
 */
async function createAuthenticatedClient() {
  const token = 'test-token';
  const ws = new WebSocket(serverUrl);
  
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);
    
    ws.on('open', () => {
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        token,
      }));
      
      // Wait for auth success
      ws.once('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            clearTimeout(timeout);
            resolve();
          } else {
            ws.close();
            reject(new Error('Authentication failed'));
          }
        } catch (error) {
          ws.close();
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  
  return ws;
}

/**
 * Benchmark WebSocket connection establishment
 */
async function benchmarkConnectionEstablishment() {
  const connections: WebSocket[] = [];
  const numConnections = Math.min(100, CONFIG.MAX_CONNECTIONS);
  
  try {
    // Create connections in parallel
    await Promise.all(
      Array(numConnections)
        .fill(null)
        .map(() => createAuthenticatedClient().then(ws => connections.push(ws)))
    );
    
    return { success: connections.length };
  } finally {
    // Clean up
    connections.forEach(ws => ws.close());
  }
}

/**
 * Benchmark message throughput
 */
async function benchmarkMessageThroughput() {
  const ws = await createAuthenticatedClient();
  const numMessages = 1000;
  let received = 0;
  let minLatency = Infinity;
  let maxLatency = 0;
  let totalLatency = 0;
  
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Test timeout'));
      }, 30000);
      
      // Set up message handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'echo_response') {
            const latency = Date.now() - message.timestamp;
            minLatency = Math.min(minLatency, latency);
            maxLatency = Math.max(maxLatency, latency);
            totalLatency += latency;
            received++;
            
            if (received >= numMessages) {
              clearTimeout(timeout);
              resolve();
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      // Send messages
      for (let i = 0; i < numMessages; i++) {
        ws.send(JSON.stringify({
          type: 'echo',
          data: `test-${i}`,
          timestamp: Date.now(),
        }));
      }
    });
    
    return {
      messagesSent: numMessages,
      messagesReceived: received,
      minLatency,
      maxLatency,
      avgLatency: totalLatency / received,
    };
  } finally {
    ws.close();
  }
}

/**
 * Benchmark concurrent connections
 */
async function benchmarkConcurrentConnections() {
  const connections: WebSocket[] = [];
  const numConnections = 100;
  const messagesPerConnection = 10;
  let messagesReceived = 0;
  let totalLatency = 0;
  
  try {
    // Create connections
    for (let i = 0; i < numConnections; i++) {
      const ws = await createAuthenticatedClient();
      connections.push(ws);
      
      // Set up message handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'echo_response') {
            const latency = Date.now() - message.timestamp;
            totalLatency += latency;
            messagesReceived++;
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
    }
    
    // Send messages from each connection
    const sendPromises = connections.map((ws, i) => {
      return new Promise<void>((resolve) => {
        let sent = 0;
        
        const sendNext = () => {
          if (sent >= messagesPerConnection) {
            resolve();
            return;
          }
          
          ws.send(JSON.stringify({
            type: 'echo',
            data: `conn-${i}-msg-${sent}`,
            timestamp: Date.now(),
          }));
          
          sent++;
          
          if (sent < messagesPerConnection) {
            setTimeout(sendNext, 10);
          } else {
            resolve();
          }
        };
        
        sendNext();
      });
    });
    
    // Wait for all messages to be sent
    await Promise.all(sendPromises);
    
    // Wait for all responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      connections: connections.length,
      messagesSent: connections.length * messagesPerConnection,
      messagesReceived,
      avgLatency: messagesReceived > 0 ? totalLatency / messagesReceived : 0,
    };
  } finally {
    // Clean up
    connections.forEach(ws => ws.close());
  }
}

/**
 * Run all WebSocket benchmarks
 */
async function runWebSocketBenchmarks() {
  console.log('🚀 Running WebSocket benchmarks...');
  
  // Set up test environment
  await setup();
  
  try {
    // Run benchmarks
    const results = await runBenchmarks(
      [
        {
          name: 'Connection Establishment',
          fn: benchmarkConnectionEstablishment,
          config: {
            iterations: 10,
            gc: true,
          },
        },
        {
          name: 'Message Throughput',
          fn: benchmarkMessageThroughput,
          config: {
            iterations: 5,
            gc: true,
          },
        },
        {
          name: 'Concurrent Connections',
          fn: benchmarkConcurrentConnections,
          config: {
            iterations: 3,
            gc: true,
          },
        },
      ],
      {
        outputDir: CONFIG.OUTPUT_DIR,
      }
    );
    
    // Format results as markdown
    const markdown = formatBenchmarkResults(results, {
      includeHeader: true,
      includeSummary: true,
    });
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = join(CONFIG.OUTPUT_DIR, `websocket-benchmark-${timestamp}.md`);
    
    writeFileSync(outputFile, markdown, 'utf8');
    console.log(`\n📊 Benchmark results saved to: ${outputFile}`);
    
    return results;
  } finally {
    // Clean up
    await teardown();
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runWebSocketBenchmarks().catch(error => {
    console.error('Error running WebSocket benchmarks:', error);
    process.exit(1);
  });
}

export { runWebSocketBenchmarks };
