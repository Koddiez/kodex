import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { AddressInfo } from 'net';
import { AuthService } from '../auth';
import { WSSecurity } from '../wsSecurity';

// Mock WebSocket server
let wss: WebSocketServer;
let server: Server;
let wsClient: WebSocket;
let wsSecurity: WSSecurity;
let authService: jest.Mocked<AuthService>;

// Test user data
const TEST_USER = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date(),
  lastActiveAt: new Date(),
  isActive: true,
};

const TEST_SESSION = {
  id: 'session-123',
  userId: 'user-123',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  metadata: {},
  isActive: true,
};

// Helper function to wait for WebSocket connection
const waitForConnection = (ws: WebSocket): Promise<void> => {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
    } else {
      ws.on('open', resolve);
    }
  });
};

// Helper function to get WebSocket messages
const getMessages = (ws: WebSocket): Promise<any[]> => {
  return new Promise((resolve) => {
    const messages: any[] = [];
    
    const messageHandler = (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
      
      // Resolve after a short delay to ensure all messages are received
      setTimeout(() => {
        ws.off('message', messageHandler);
        resolve(messages);
      }, 50);
    };
    
    ws.on('message', messageHandler);
  });
};

// Set up test environment
beforeAll((done) => {
  // Create HTTP server
  server = new Server();
  
  // Create WebSocket server
  wss = new WebSocketServer({ server });
  
  // Mock auth service
  authService = {
    validateToken: jest.fn(),
  } as any;
  
  // Initialize WebSocket security
  wsSecurity = new WSSecurity(wss, {
    authService,
    debug: true,
    maxConnectionsPerIp: 2,
    maxMessagesPerSecond: 5,
  });
  
  // Start server on random port
  server.listen(0, () => {
    const port = (server.address() as AddressInfo).port;
    wsClient = new WebSocket(`ws://localhost:${port}`);
    
    // Wait for connection to be established
    wsClient.on('open', () => {
      done();
    });
  });
});

afterAll(() => {
  wsClient.close();
  wss.close();
  server.close();
  wsSecurity.cleanup();
});

describe('WSSecurity', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock successful authentication
    authService.validateToken.mockResolvedValue({
      user: TEST_USER,
      session: TEST_SESSION,
    });
  });
  
  it('should require authentication', async () => {
    // Send a message without authenticating
    wsClient.send(JSON.stringify({ type: 'ping' }));
    
    // Wait for messages
    const messages = await getMessages(wsClient);
    
    // Should receive auth_required message
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'auth_required',
        message: 'Authentication required',
      })
    );
    
    // Should not process the ping message
    expect(messages).not.toContainEqual(
      expect.objectContaining({
        type: 'pong',
      })
    );
  });
  
  it('should authenticate with valid token', async () => {
    // Send auth message
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    // Wait for messages
    const messages = await getMessages(wsClient);
    
    // Should receive auth_success message
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'auth_success',
        userId: TEST_USER.id,
        sessionId: TEST_SESSION.id,
        user: expect.objectContaining({
          id: TEST_USER.id,
          name: TEST_USER.name,
          email: TEST_USER.email,
          role: TEST_USER.role,
        }),
      })
    );
    
    // Auth service should have been called with the token
    expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
  });
  
  it('should handle ping/pong', async () => {
    // Authenticate first
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    // Wait for auth to complete
    await getMessages(wsClient);
    
    // Send ping
    wsClient.send(JSON.stringify({ type: 'ping' }));
    
    // Should receive pong
    const messages = await getMessages(wsClient);
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'pong',
        timestamp: expect.any(Number),
      })
    );
  });
  
  it('should handle joining and leaving rooms', async () => {
    // Authenticate first
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    // Wait for auth to complete
    await getMessages(wsClient);
    
    // Join a room
    wsClient.send(JSON.stringify({
      type: 'join',
      roomId: 'test-room',
    }));
    
    // Should receive room_joined message
    let messages = await getMessages(wsClient);
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'room_joined',
        roomId: 'test-room',
      })
    );
    
    // Leave the room
    wsClient.send(JSON.stringify({
      type: 'leave',
      roomId: 'test-room',
    }));
    
    // Should receive left_room message
    messages = await getMessages(wsClient);
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'left_room',
        roomId: 'test-room',
      })
    );
  });
  
  it('should handle broadcasting to rooms', async () => {
    // Create a second client
    const client2 = new WebSocket(`ws://localhost:${(server.address() as AddressInfo).port}`);
    
    // Helper to send messages from client2
    const sendFromClient2 = (data: any) => {
      return new Promise<void>((resolve) => {
        client2.send(JSON.stringify(data), () => resolve());
      });
    };
    
    // Wait for connection
    await waitForConnection(client2);
    
    // Authenticate both clients
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    await sendFromClient2({
      type: 'auth',
      token: 'valid-token',
    });
    
    // Clear initial messages
    await getMessages(wsClient);
    await getMessages(client2);
    
    // Both clients join the same room
    wsClient.send(JSON.stringify({
      type: 'join',
      roomId: 'broadcast-room',
    }));
    
    await sendFromClient2({
      type: 'join',
      roomId: 'broadcast-room',
    });
    
    // Clear join messages
    await getMessages(wsClient);
    await getMessages(client2);
    
    // Client 1 sends a broadcast
    wsClient.send(JSON.stringify({
      type: 'broadcast',
      roomId: 'broadcast-room',
      data: { message: 'Hello, room!' },
    }));
    
    // Client 2 should receive the broadcast
    const client2Messages = await getMessages(client2);
    expect(client2Messages).toContainEqual(
      expect.objectContaining({
        type: 'broadcast',
        roomId: 'broadcast-room',
        data: { message: 'Hello, room!' },
      })
    );
    
    // Client 1 should not receive its own broadcast (excluded by default)
    const client1Messages = await getMessages(wsClient);
    expect(client1Messages).toHaveLength(0);
    
    // Clean up
    client2.close();
  });
  
  it('should enforce connection limits', async () => {
    // Create max connections (2 total, 1 already connected)
    const client2 = new WebSocket(`ws://localhost:${(server.address() as AddressInfo).port}`);
    await waitForConnection(client2);
    
    // Try to create a third connection (should be rejected)
    const client3 = new WebSocket(`ws://localhost:${(server.address() as AddressInfo).port}`);
    
    // Wait for connection close
    const closeEvent = await new Promise<CloseEvent>((resolve) => {
      client3.onclose = resolve;
    });
    
    expect(closeEvent.code).toBe(4002); // Connection limit reached
    expect(closeEvent.reason).toBe('Connection limit reached');
    
    // Clean up
    client2.close();
    client3.close();
  });
  
  it('should enforce rate limiting', async () => {
    // Authenticate
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    // Wait for auth to complete
    await getMessages(wsClient);
    
    // Send max messages per second (5)
    for (let i = 0; i < 5; i++) {
      wsClient.send(JSON.stringify({ type: 'ping' }));
    }
    
    // Wait for responses
    await getMessages(wsClient);
    
    // Next message should be rate limited
    wsClient.send(JSON.stringify({ type: 'ping' }));
    const messages = await getMessages(wsClient);
    
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'error',
        message: 'Rate limit exceeded',
      })
    );
  });
  
  it('should handle custom message types', (done) => {
    // Set up message handler
    wss.on('message', ({ ws, message, reply }) => {
      try {
        if (message.type === 'custom') {
          expect(message.data).toBe('test');
          reply({ type: 'custom_response', data: 'response' });
          done();
        }
      } catch (error) {
        done(error);
      }
    });
    
    // Authenticate
    wsClient.send(JSON.stringify({
      type: 'auth',
      token: 'valid-token',
    }));
    
    // Wait for auth to complete
    wsClient.once('message', () => {
      // Send custom message
      wsClient.send(JSON.stringify({
        type: 'custom',
        data: 'test',
      }));
    });
  });
});
