import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, Session, SessionParticipant, SessionPermission, SessionEvent } from '../collaboration/types';
import { useCollaboration } from './useCollaboration';

interface UseSessionManagerProps {
  /**
   * Current user information
   */
  currentUser: User;
  
  /**
   * Document ID for the session
   */
  documentId: string;
  
  /**
   * Document title (optional)
   */
  documentTitle?: string;
  
  /**
   * Whether collaboration features are enabled
   */
  enabled?: boolean;
  
  /**
   * Callback when the session is updated
   */
  onSessionUpdate?: (session: Session) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * Hook to manage collaboration sessions
 */
export function useSessionManager({
  currentUser,
  documentId,
  documentTitle = 'Untitled Document',
  enabled = true,
  onSessionUpdate,
  onError,
}: UseSessionManagerProps) {
  // Session state
  const [session, setSession] = useState<Session>(() => ({
    id: uuidv4(),
    name: documentTitle,
    documentId,
    ownerId: currentUser.id,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participants: [
      {
        userId: currentUser.id,
        permissions: ['read', 'write', 'comment', 'share', 'admin'] as SessionPermission[],
        joinedAt: new Date().toISOString(),
      },
    ],
    history: [
      {
        id: uuidv4(),
        type: 'session_created',
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        action: 'created the session',
      },
    ],
  }));
  
  // UI state
  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'invite' | 'settings' | 'history'>('participants');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the collaboration service instance
  const collaboration = useCollaboration({
    enabled,
    documentId,
    user: currentUser,
    onRemoteChange: (content) => {
      // Handle remote content changes
      console.log('Remote content changed');
    },
    onUserJoined: (user) => {
      addSessionEvent({
        type: 'user_joined',
        userId: user.id,
        userName: user.name,
        action: 'joined the session',
      });
      
      // Update participants list
      setSession(prev => {
        const participantExists = prev.participants.some(p => p.userId === user.id);
        if (participantExists) return prev;
        
        return {
          ...prev,
          participants: [
            ...prev.participants,
            {
              userId: user.id,
              permissions: ['read', 'write', 'comment'] as SessionPermission[],
              joinedAt: new Date().toISOString(),
            },
          ],
        };
      });
    },
    onUserLeft: (userId) => {
      const user = session.participants.find(p => p.userId === userId)?.userName || 'A user';
      
      addSessionEvent({
        type: 'user_left',
        userId,
        userName: user,
        action: 'left the session',
      });
      
      // Don't remove from participants, just mark as offline
      // The user might reconnect
    },
    onChatMessage: (message) => {
      addSessionEvent({
        type: 'chat_message',
        userId: message.from.id,
        userName: message.from.name,
        action: `sent a message: "${message.content}"`,
      });
    },
  });
  
  // Add an event to the session history
  const addSessionEvent = useCallback((event: Omit<SessionEvent, 'id' | 'timestamp'>) => {
    const newEvent: SessionEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    setSession(prev => ({
      ...prev,
      history: [newEvent, ...prev.history].slice(0, 100), // Keep last 100 events
      updatedAt: newEvent.timestamp,
    }));
  }, []);
  
  // Update session data
  const updateSession = useCallback((updates: Partial<Session>) => {
    setSession(prev => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      
      // Add to history if name changed
      if (updates.name && updates.name !== prev.name) {
        updated.history = [
          {
            id: uuidv4(),
            type: 'session_updated',
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            action: `renamed the session to "${updates.name}"`,
          },
          ...updated.history,
        ].slice(0, 100);
      }
      
      // Notify parent component
      onSessionUpdate?.(updated);
      
      return updated;
    });
  }, [currentUser.id, currentUser.name, onSessionUpdate]);
  
  // Invite a user to the session
  const inviteUser = useCallback(async (email: string, permissions: SessionPermission[]) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, this would send an invitation email
      // For now, we'll just simulate it
      console.log(`Inviting ${email} with permissions:`, permissions);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addSessionEvent({
        type: 'user_invited',
        userId: currentUser.id,
        userName: currentUser.name,
        action: `invited ${email} to the session`,
      });
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send invitation');
      setError(error.message);
      onError?.(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addSessionEvent, currentUser.id, currentUser.name, onError]);
  
  // Remove a user from the session
  const removeUser = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, this would notify the user and update the database
      console.log(`Removing user ${userId} from session`);
      
      // If it's the current user, just close the session manager
      if (userId === currentUser.id) {
        setIsSessionManagerOpen(false);
        return true;
      }
      
      // Remove from participants
      setSession(prev => {
        const participant = prev.participants.find(p => p.userId === userId);
        if (!participant) return prev;
        
        // Add to history
        const event: SessionEvent = {
          id: uuidv4(),
          type: 'user_removed',
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString(),
          action: `removed ${participant.userName || 'a user'} from the session`,
        };
        
        return {
          ...prev,
          participants: prev.participants.filter(p => p.userId !== userId),
          history: [event, ...prev.history].slice(0, 100),
          updatedAt: new Date().toISOString(),
        };
      });
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove user');
      setError(error.message);
      onError?.(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, currentUser.name, onError]);
  
  // Update user permissions
  const updateUserPermissions = useCallback(async (userId: string, newPermissions: SessionPermission[]) => {
    try {
      setSession(prev => {
        const participantIndex = prev.participants.findIndex(p => p.userId === userId);
        if (participantIndex === -1) return prev;
        
        const participant = prev.participants[participantIndex];
        const oldPermissions = [...participant.permissions];
        
        // Don't update if permissions haven't changed
        if (
          oldPermissions.length === newPermissions.length &&
          oldPermissions.every(p => newPermissions.includes(p))
        ) {
          return prev;
        }
        
        // Update participant
        const updatedParticipants = [...prev.participants];
        updatedParticipants[participantIndex] = {
          ...participant,
          permissions: newPermissions,
        };
        
        // Add to history
        const event: SessionEvent = {
          id: uuidv4(),
          type: 'permissions_updated',
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: new Date().toISOString(),
          action: `updated permissions for ${participant.userName || 'a user'}`,
        };
        
        return {
          ...prev,
          participants: updatedParticipants,
          history: [event, ...prev.history].slice(0, 100),
          updatedAt: new Date().toISOString(),
        };
      });
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update permissions');
      setError(error.message);
      onError?.(error);
      return false;
    }
  }, [currentUser.id, currentUser.name, onError]);
  
  // End the session for all participants
  const endSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, this would notify all participants and clean up resources
      console.log('Ending session for all participants');
      
      // Add to history
      addSessionEvent({
        type: 'session_ended',
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'ended the session',
      });
      
      // Close the session manager
      setIsSessionManagerOpen(false);
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to end session');
      setError(error.message);
      onError?.(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addSessionEvent, currentUser.id, currentUser.name, onError]);
  
  // Open the session manager
  const openSessionManager = useCallback((tab?: typeof activeTab) => {
    if (tab) {
      setActiveTab(tab);
    }
    setIsSessionManagerOpen(true);
  }, []);
  
  // Close the session manager
  const closeSessionManager = useCallback(() => {
    setIsSessionManagerOpen(false);
  }, []);
  
  // Get active users (users who are currently connected)
  const activeUsers = useCallback(() => {
    if (!collaboration.service) return [];
    
    const connectedUserIds = collaboration.service.getActiveUsers().map(u => u.id);
    return session.participants
      .filter(p => connectedUserIds.includes(p.userId))
      .map(p => ({
        ...p,
        // Add user details from the collaboration service
        ...collaboration.service?.getUser(p.userId) || {},
      }));
  }, [collaboration.service, session.participants]);
  
  // Effect to update document title when session name changes
  useEffect(() => {
    if (session.name && session.name !== documentTitle) {
      document.title = `${session.name} - Kodex`;
    }
  }, [session.name, documentTitle]);
  
  return {
    // State
    session,
    isSessionManagerOpen,
    setIsSessionManagerOpen,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    
    // Actions
    updateSession,
    inviteUser,
    removeUser,
    updateUserPermissions,
    endSession,
    openSessionManager,
    closeSessionManager,
    
    // Derived state
    activeUsers: activeUsers(),
    isOwner: session.ownerId === currentUser.id,
    currentUserPermissions: session.participants.find(p => p.userId === currentUser.id)?.permissions || [],
    
    // Collaboration service
    collaborationService: collaboration.service,
  };
}

export type UseSessionManagerReturn = ReturnType<typeof useSessionManager>;
