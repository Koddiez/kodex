import { TextOperation } from 'ot';
import { Operation } from './types';

/**
 * Represents a change to the document
 */
export interface DocumentChange {
  /**
   * The operation that was applied
   */
  operation: Operation;
  
  /**
   * The version of the document before this change was applied
   */
  baseVersion: number;
  
  /**
   * The version of the document after this change was applied
   */
  targetVersion: number;
  
  /**
   * The ID of the user who made the change
   */
  userId: string;
  
  /**
   * Timestamp when the change was made
   */
  timestamp: number;
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  /**
   * Last write wins - the most recent change takes precedence
   */
  LastWriteWins = 'last-write-wins',
  
  /**
   * Manual resolution - prompt the user to resolve conflicts
   */
  Manual = 'manual',
  
  /**
   * Server authoritative - let the server decide how to resolve conflicts
   */
  ServerAuthoritative = 'server-authoritative',
  
  /**
   * Custom merge - use a custom merge function to resolve conflicts
   */
  CustomMerge = 'custom-merge',
}

/**
 * Options for conflict resolution
 */
export interface ConflictResolutionOptions {
  /**
   * The strategy to use for resolving conflicts
   */
  strategy: ConflictResolutionStrategy;
  
  /**
   * Custom merge function (required if strategy is CustomMerge)
   */
  customMerge?: (
    localChange: DocumentChange,
    remoteChange: DocumentChange,
    currentContent: string
  ) => { resolved: boolean; mergedOperation?: Operation; };
  
  /**
   * Callback for manual conflict resolution (required if strategy is Manual)
   */
  onManualResolve?: (
    localChange: DocumentChange,
    remoteChange: DocumentChange,
    resolve: (operation?: Operation) => void
  ) => void;
  
  /**
   * Whether to log conflict resolution details
   */
  debug?: boolean;
}

/**
 * Class for handling conflict resolution in collaborative editing
 */
export class ConflictResolver {
  private documentVersion: number = 0;
  private pendingChanges: DocumentChange[] = [];
  private appliedChanges: DocumentChange[] = [];
  private options: ConflictResolutionOptions;
  
  constructor(options: ConflictResolutionOptions) {
    this.options = options;
  }
  
  /**
   * Get the current document version
   */
  getVersion(): number {
    return this.documentVersion;
  }
  
  /**
   * Apply a local change to the document
   * @param operation The operation to apply
   * @param userId The ID of the user making the change
   * @returns The new document version if successful, or null if the change was rejected
   */
  applyLocalChange(operation: Operation, userId: string): number | null {
    const change: DocumentChange = {
      operation,
      baseVersion: this.documentVersion,
      targetVersion: this.documentVersion + 1,
      userId,
      timestamp: Date.now(),
    };
    
    // Add to pending changes
    this.pendingChanges.push(change);
    
    // Apply the operation locally
    this.documentVersion++;
    this.appliedChanges.push(change);
    
    if (this.options.debug) {
      console.log(`[ConflictResolver] Applied local change v${change.baseVersion} -> v${change.targetVersion}`, change);
    }
    
    return this.documentVersion;
  }
  
  /**
   * Receive a remote change from another client
   * @param change The remote change to apply
   * @returns The resolved operation to apply, or null if the change was rejected
   */
  receiveRemoteChange(change: DocumentChange): Operation | null {
    if (change.baseVersion < 0 || change.baseVersion > this.documentVersion) {
      // The change is based on an invalid version, reject it
      if (this.options.debug) {
        console.warn(`[ConflictResolver] Rejected remote change with invalid base version: ${change.baseVersion} (current: ${this.documentVersion})`);
      }
      return null;
    }
    
    if (change.baseVersion === this.documentVersion) {
      // No conflict, apply the change directly
      this.documentVersion++;
      this.appliedChanges.push(change);
      
      if (this.options.debug) {
        console.log(`[ConflictResolver] Applied non-conflicting remote change v${change.baseVersion} -> v${change.targetVersion}`);
      }
      
      return change.operation;
    }
    
    // We have a conflict, resolve it based on the selected strategy
    return this.resolveConflict(change);
  }
  
  /**
   * Resolve a conflict between local and remote changes
   * @param remoteChange The remote change that conflicts with local changes
   * @returns The resolved operation to apply, or null if the change was rejected
   */
  private resolveConflict(remoteChange: DocumentChange): Operation | null {
    if (this.options.debug) {
      console.log(`[ConflictResolver] Resolving conflict for remote change v${remoteChange.baseVersion} -> v${remoteChange.targetVersion} (current: v${this.documentVersion})`);
    }
    
    // Find the last local change that was applied before the remote change
    const lastLocalChange = this.findLastChangeBefore(remoteChange.baseVersion);
    
    if (!lastLocalChange) {
      // No local changes to conflict with, apply the remote change
      this.documentVersion = remoteChange.targetVersion;
      this.appliedChanges.push(remoteChange);
      
      if (this.options.debug) {
        console.log(`[ConflictResolver] No local changes to conflict with, applying remote change`);
      }
      
      return remoteChange.operation;
    }
    
    // Find all local changes that conflict with the remote change
    const conflictingChanges = this.findConflictingChanges(remoteChange.baseVersion);
    
    if (this.options.debug) {
      console.log(`[ConflictResolver] Found ${conflictingChanges.length} conflicting local changes`);
    }
    
    // Apply the selected conflict resolution strategy
    switch (this.options.strategy) {
      case ConflictResolutionStrategy.LastWriteWins:
        return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
        
      case ConflictResolutionStrategy.Manual:
        return this.resolveManually(remoteChange, conflictingChanges);
        
      case ConflictResolutionStrategy.ServerAuthoritative:
        // In a real implementation, this would delegate to the server
        // For now, we'll just use last-write-wins
        console.warn('Server authoritative conflict resolution not implemented, falling back to last-write-wins');
        return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
        
      case ConflictResolutionStrategy.CustomMerge:
        if (this.options.customMerge) {
          return this.resolveWithCustomMerge(remoteChange, conflictingChanges);
        }
        console.warn('Custom merge function not provided, falling back to last-write-wins');
        return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
        
      default:
        console.warn(`Unknown conflict resolution strategy: ${this.options.strategy}, falling back to last-write-wins`);
        return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
    }
  }
  
  /**
   * Resolve conflicts using the last-write-wins strategy
   */
  private resolveWithLastWriteWins(
    remoteChange: DocumentChange,
    conflictingChanges: DocumentChange[]
  ): Operation | null {
    // Always prefer the most recent change
    const mostRecentChange = [...conflictingChanges, remoteChange].sort((a, b) => 
      b.timestamp - a.timestamp
    )[0];
    
    if (mostRecentChange === remoteChange) {
      // The remote change is the most recent, apply it
      this.documentVersion = remoteChange.targetVersion;
      this.appliedChanges.push(remoteChange);
      
      if (this.options.debug) {
        console.log(`[ConflictResolver] Applied remote change (last-write-wins) v${remoteChange.baseVersion} -> v${remoteChange.targetVersion}`);
      }
      
      return remoteChange.operation;
    } else {
      // A local change is more recent, reject the remote change
      if (this.options.debug) {
        console.log(`[ConflictResolver] Rejected remote change (local change is more recent)`, {
          remoteChange,
          conflictingChanges,
        });
      }
      
      return null;
    }
  }
  
  /**
   * Resolve conflicts manually by prompting the user
   */
  private resolveManually(
    remoteChange: DocumentChange,
    conflictingChanges: DocumentChange[]
  ): Operation | null {
    if (!this.options.onManualResolve) {
      console.warn('Manual conflict resolution requested but no handler provided, falling back to last-write-wins');
      return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
    }
    
    // In a real implementation, this would show a UI dialog to the user
    // For now, we'll just log and use last-write-wins
    console.warn('Manual conflict resolution not implemented in this example, falling back to last-write-wins');
    
    return new Promise((resolve) => {
      // This would normally show a dialog to the user
      // For now, we'll just simulate a short delay and use last-write-wins
      setTimeout(() => {
        const result = this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
        resolve(result);
      }, 100);
    });
  }
  
  /**
   * Resolve conflicts using a custom merge function
   */
  private resolveWithCustomMerge(
    remoteChange: DocumentChange,
    conflictingChanges: DocumentChange[]
  ): Operation | null {
    if (!this.options.customMerge) {
      throw new Error('Custom merge function not provided');
    }
    
    // For simplicity, we'll just pass the most recent conflicting change
    // In a real implementation, you might want to pass all conflicting changes
    const mostRecentLocalChange = [...conflictingChanges].sort((a, b) => 
      b.timestamp - a.timestamp
    )[0];
    
    const currentContent = this.reconstructDocument();
    const result = this.options.customMerge(
      mostRecentLocalChange,
      remoteChange,
      currentContent
    );
    
    if (result.resolved && result.mergedOperation) {
      // Apply the merged operation
      const mergedChange: DocumentChange = {
        operation: result.mergedOperation,
        baseVersion: this.documentVersion,
        targetVersion: this.documentVersion + 1,
        userId: remoteChange.userId, // Use the remote user's ID for the merged change
        timestamp: Date.now(),
      };
      
      this.documentVersion = mergedChange.targetVersion;
      this.appliedChanges.push(mergedChange);
      
      if (this.options.debug) {
        console.log(`[ConflictResolver] Applied merged operation v${mergedChange.baseVersion} -> v${mergedChange.targetVersion}`);
      }
      
      return mergedChange.operation;
    }
    
    // If the custom merge didn't resolve the conflict, fall back to last-write-wins
    if (this.options.debug) {
      console.log(`[ConflictResolver] Custom merge did not resolve the conflict, falling back to last-write-wins`);
    }
    
    return this.resolveWithLastWriteWins(remoteChange, conflictingChanges);
  }
  
  /**
   * Find the last change that was applied before the specified version
   */
  private findLastChangeBefore(version: number): DocumentChange | null {
    for (let i = this.appliedChanges.length - 1; i >= 0; i--) {
      if (this.appliedChanges[i].targetVersion <= version) {
        return this.appliedChanges[i];
      }
    }
    return null;
  }
  
  /**
   * Find all changes that conflict with the specified version
   */
  private findConflictingChanges(baseVersion: number): DocumentChange[] {
    return this.appliedChanges.filter(
      change => change.baseVersion >= baseVersion || change.targetVersion > baseVersion
    );
  }
  
  /**
   * Reconstruct the current document by applying all changes
   */
  private reconstructDocument(): string {
    // In a real implementation, this would apply all operations to the initial document
    // For simplicity, we'll just return an empty string
    return '';
  }
  
  /**
   * Transform an operation against a sequence of operations
   */
  static transformOperation(
    operation: Operation,
    operations: Operation[],
    isOwnOperation: boolean
  ): Operation {
    // In a real implementation, this would use operational transformation
    // to transform the operation against the sequence of operations
    // For now, we'll just return the operation as-is
    return operation;
  }
}

/**
 * Default conflict resolution options
 */
export const defaultConflictResolutionOptions: ConflictResolutionOptions = {
  strategy: ConflictResolutionStrategy.LastWriteWins,
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Create a new conflict resolver with the specified options
 */
export function createConflictResolver(
  options: Partial<ConflictResolutionOptions> = {}
): ConflictResolver {
  return new ConflictResolver({
    ...defaultConflictResolutionOptions,
    ...options,
  });
}
