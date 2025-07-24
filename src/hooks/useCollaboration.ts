import { useEffect, useRef, useCallback, useState } from 'react';
import { CollaborationService } from '../collaboration/CollaborationService';
import { CollaborationOptions, User, CursorPosition, SelectionRange, AnyMessage } from '../collaboration/types';
import { useMonaco } from '@monaco-editor/react';

export interface UseCollaborationProps {
  enabled?: boolean;
  documentId: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  onReady?: (service: CollaborationService) => void;
  onRemoteChange?: (content: string) => void;
  onUserJoined?: (user: User) => void;
  onUserLeft?: (userId: string) => void;
  onChatMessage?: (message: { from: User; content: string; timestamp: Date }) => void;
  options?: Partial<CollaborationOptions>;
}

export function useCollaboration({
  enabled = true,
  documentId,
  user,
  onReady,
  onRemoteChange,
  onUserJoined,
  onUserLeft,
  onChatMessage,
  options = {},
}: UseCollaborationProps) {
  const monaco = useMonaco();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [collaborationService, setCollaborationService] = useState<CollaborationService | null>(null);
  const lastCursorPosition = useRef<CursorPosition | null>(null);
  const lastSelection = useRef<SelectionRange | null>(null);
  const isApplyingRemoteChanges = useRef(false);
  const pendingChanges = useRef<Array<() => void>>([]);
  
  // Initialize collaboration service
  useEffect(() => {
    if (!enabled || !documentId) return;
    
    const service = new CollaborationService({
      enabled: true,
      user,
      document: {
        id: documentId,
        ...options.document,
      },
      callbacks: {
        onConnect: () => {
          console.log('Connected to collaboration service');
          setIsConnected(true);
          onReady?.(service);
        },
        onDisconnect: (reason) => {
          console.log('Disconnected from collaboration service:', reason);
          setIsConnected(false);
        },
        onError: (error) => {
          console.error('Collaboration error:', error);
        },
        onPresenceUpdate: (presence) => {
          setActiveUsers(
            presence.activeUsers
              .map(id => presence.users[id])
              .filter(Boolean)
          );
        },
        onUserJoined: (user) => {
          console.log('User joined:', user.name);
          onUserJoined?.(user);
        },
        onUserLeft: (userId) => {
          console.log('User left:', userId);
          onUserLeft?.(userId);
        },
        onMessage: (message: AnyMessage) => {
          if (message.type === 'chat') {
            const user = service.getActiveUsers().find(u => u.id === message.from);
            if (user) {
              onChatMessage?.({
                from: user,
                content: message.payload.content,
                timestamp: new Date(message.timestamp),
              });
            }
          } else if (message.type === 'edit' && onRemoteChange) {
            // Handle remote document changes
            isApplyingRemoteChanges.current = true;
            try {
              onRemoteChange(message.payload.content);
            } finally {
              isApplyingRemoteChanges.current = false;
              // Apply any pending local changes
              const changes = pendingChanges.current;
              pendingChanges.current = [];
              changes.forEach(change => change());
            }
          }
        },
      },
      ...options,
    });

    setCollaborationService(service);
    service.connect();

    return () => {
      service.disconnect();
      setCollaborationService(null);
    };
  }, [enabled, documentId, user.id]);

  // Update cursor position
  const updateCursorPosition = useCallback((position: CursorPosition, filePath: string) => {
    if (!collaborationService || !isConnected) return;
    
    lastCursorPosition.current = position;
    collaborationService.updateCursor(position, filePath);
  }, [collaborationService, isConnected]);

  // Update selection
  const updateSelection = useCallback((selection: SelectionRange, filePath: string) => {
    if (!collaborationService || !isConnected) return;
    
    lastSelection.current = selection;
    collaborationService.updateSelection(selection, filePath);
  }, [collaborationService, isConnected]);

  // Send chat message
  const sendChatMessage = useCallback((content: string, replyTo?: string, mentions: string[] = []) => {
    if (!collaborationService || !isConnected) return;
    
    collaborationService.sendChatMessage(content, replyTo, mentions);
  }, [collaborationService, isConnected]);

  // Apply local changes to the document
  const applyLocalChanges = useCallback((changes: Array<{
    range: { start: number; end: number };
    text: string;
  }>, filePath: string) => {
    if (!collaborationService || !isConnected) return;
    
    if (isApplyingRemoteChanges.current) {
      // Queue the change if we're currently applying remote changes
      pendingChanges.current.push(() => {
        collaborationService.applyChanges(changes, filePath);
      });
    } else {
      collaborationService.applyChanges(changes, filePath);
    }
  }, [collaborationService, isConnected]);

  // Update user presence
  const updatePresence = useCallback((update: Partial<User>) => {
    if (!collaborationService || !isConnected) return;
    
    collaborationService.updatePresence(update);
  }, [collaborationService, isConnected]);

  // Get user by ID
  const getUserById = useCallback((userId: string): User | undefined => {
    if (!collaborationService) return undefined;
    
    return collaborationService.getActiveUsers().find(user => user.id === userId);
  }, [collaborationService]);

  return {
    // State
    isConnected,
    activeUsers,
    service: collaborationService,
    
    // Methods
    updateCursorPosition,
    updateSelection,
    sendChatMessage,
    applyLocalChanges,
    updatePresence,
    getUserById,
    
    // Current user state
    currentUser: user,
    lastCursorPosition: lastCursorPosition.current,
    lastSelection: lastSelection.current,
  };
}
