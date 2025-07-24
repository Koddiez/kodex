import { ConflictResolver, ConflictResolutionStrategy, createConflictResolver, DocumentChange } from '../conflictResolution';

describe('ConflictResolver', () => {
  // Mock operation type for testing
  type TestOperation = {
    type: 'insert' | 'delete' | 'retain';
    position: number;
    text?: string;
    length?: number;
  };

  // Helper function to create a test operation
  const op = (type: 'insert' | 'delete' | 'retain', position: number, text?: string, length?: number): TestOperation => {
    return { type, position, text, length };
  };

  // Helper function to create a test document change
  const createChange = (
    operation: TestOperation,
    baseVersion: number,
    userId: string,
    timestamp: number = Date.now()
  ): DocumentChange => ({
    operation,
    baseVersion,
    targetVersion: baseVersion + 1,
    userId,
    timestamp,
  });

  describe('Last-Write-Wins Strategy', () => {
    let resolver: ConflictResolver;
    const user1 = 'user1';
    const user2 = 'user2';
    const now = Date.now();

    beforeEach(() => {
      resolver = createConflictResolver({
        strategy: ConflictResolutionStrategy.LastWriteWins,
        debug: false,
      });
    });

    it('should apply non-conflicting changes in order', () => {
      // User 1 makes a change
      const change1 = createChange(op('insert', 0, 'Hello'), 0, user1, now);
      const result1 = resolver.receiveRemoteChange(change1);
      expect(result1).toEqual(change1.operation);
      expect(resolver.getVersion()).toBe(1);

      // User 2 makes a change based on version 1
      const change2 = createChange(op('insert', 5, ' World'), 1, user2, now + 1000);
      const result2 = resolver.receiveRemoteChange(change2);
      expect(result2).toEqual(change2.operation);
      expect(resolver.getVersion()).toBe(2);
    });

    it('should resolve concurrent changes using last-write-wins', () => {
      // Both users start with the same document version (0)
      
      // User 1 makes a change (arrives first but has an earlier timestamp)
      const change1 = createChange(op('insert', 0, 'Hello'), 0, user1, now);
      
      // User 2 makes a concurrent change (arrives later but has a later timestamp)
      const change2 = createChange(op('insert', 0, 'Hi '), 0, user2, now + 1000);
      
      // Apply user 1's change first
      const result1 = resolver.receiveRemoteChange(change1);
      expect(result1).toEqual(change1.operation);
      expect(resolver.getVersion()).toBe(1);
      
      // Apply user 2's change (should win because it has a later timestamp)
      const result2 = resolver.receiveRemoteChange(change2);
      expect(result2).not.toBeNull();
      expect(resolver.getVersion()).toBe(2);
    });

    it('should reject changes with invalid base versions', () => {
      // Try to apply a change with a future base version
      const futureChange = createChange(op('insert', 0, 'Future'), 10, user1);
      const result = resolver.receiveRemoteChange(futureChange);
      expect(result).toBeNull();
      expect(resolver.getVersion()).toBe(0);
      
      // Apply a valid change
      const validChange = createChange(op('insert', 0, 'Hello'), 0, user1);
      resolver.receiveRemoteChange(validChange);
      expect(resolver.getVersion()).toBe(1);
      
      // Try to apply a change with a stale base version
      const staleChange = createChange(op('insert', 5, ' World'), 0, user2);
      const staleResult = resolver.receiveRemoteChange(staleChange);
      expect(staleResult).toBeNull();
      expect(resolver.getVersion()).toBe(1);
    });
  });

  describe('Custom Merge Strategy', () => {
    it('should use the custom merge function when provided', () => {
      const customMerge = jest.fn((localChange, remoteChange) => ({
        resolved: true,
        mergedOperation: { type: 'insert', position: 0, text: 'Merged' },
      }));

      const resolver = createConflictResolver({
        strategy: ConflictResolutionStrategy.CustomMerge,
        customMerge,
        debug: false,
      });

      // Apply initial change
      const change1 = createChange(op('insert', 0, 'Hello'), 0, 'user1');
      resolver.receiveRemoteChange(change1);

      // Create a conflicting change
      const change2 = createChange(op('insert', 0, 'Hi'), 0, 'user2', Date.now() + 1000);
      const result = resolver.receiveRemoteChange(change2);

      // Should have called the custom merge function
      expect(customMerge).toHaveBeenCalled();
      expect(result).toEqual({ type: 'insert', position: 0, text: 'Merged' });
    });

    it('should fall back to last-write-wins if custom merge does not resolve', () => {
      const customMerge = jest.fn(() => ({
        resolved: false,
      }));

      const resolver = createConflictResolver({
        strategy: ConflictResolutionStrategy.CustomMerge,
        customMerge,
        debug: false,
      });

      // Apply initial change
      const change1 = createChange(op('insert', 0, 'Hello'), 0, 'user1', 1000);
      resolver.receiveRemoteChange(change1);

      // Create a conflicting change with a later timestamp
      const change2 = createChange(op('insert', 0, 'Hi'), 0, 'user2', 2000);
      const result = resolver.receiveRemoteChange(change2);

      // Should have called the custom merge function
      expect(customMerge).toHaveBeenCalled();
      // Should have fallen back to last-write-wins and applied the second change
      expect(result).toEqual(change2.operation);
    });
  });

  describe('Manual Resolution Strategy', () => {
    it('should call the manual resolution handler when conflicts occur', () => {
      const manualResolve = jest.fn((localChange, remoteChange, resolve) => {
        resolve(remoteChange.operation); // Always accept remote change
      });

      const resolver = createConflictResolver({
        strategy: ConflictResolutionStrategy.Manual,
        onManualResolve: manualResolve,
        debug: false,
      });

      // Apply initial change
      const change1 = createChange(op('insert', 0, 'Hello'), 0, 'user1');
      resolver.receiveRemoteChange(change1);

      // Create a conflicting change
      const change2 = createChange(op('insert', 0, 'Hi'), 0, 'user2', Date.now() + 1000);
      const result = resolver.receiveRemoteChange(change2);

      // Should have called the manual resolve handler
      expect(manualResolve).toHaveBeenCalled();
      // Should have applied the remote change as resolved by the handler
      expect(result).toEqual(change2.operation);
    });
  });

  describe('Document Version Management', () => {
    it('should maintain correct document versions', () => {
      const resolver = createConflictResolver({
        strategy: ConflictResolutionStrategy.LastWriteWins,
        debug: false,
      });

      expect(resolver.getVersion()).toBe(0);

      // Apply first change
      const change1 = createChange(op('insert', 0, 'Hello'), 0, 'user1');
      resolver.receiveRemoteChange(change1);
      expect(resolver.getVersion()).toBe(1);

      // Apply second change
      const change2 = createChange(op('insert', 5, ' World'), 1, 'user1');
      resolver.receiveRemoteChange(change2);
      expect(resolver.getVersion()).toBe(2);

      // Apply a conflicting change with an older base version
      const change3 = createChange(op('insert', 0, 'Hi '), 0, 'user2');
      const result = resolver.receiveRemoteChange(change3);
      expect(result).not.toBeNull();
      expect(resolver.getVersion()).toBe(3);
    });
  });
});
