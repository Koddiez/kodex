import React, { useState, useRef, useEffect } from 'react';
import { MonacoEditorProps } from '@monaco-editor/react';
import { CollaborationOverlay } from './CollaborationOverlay';
import { CollaborationChat } from './CollaborationChat';
import { User } from '../collaboration/types';
import { useCollaboration } from '../hooks/useCollaboration';

export interface CollaborationWrapperProps {
  /**
   * Document ID for collaboration
   */
  documentId: string;
  
  /**
   * Current file path
   */
  filePath: string;
  
  /**
   * Current user information
   */
  user: User;
  
  /**
   * Editor content
   */
  value: string;
  
  /**
   * Callback when content changes
   */
  onChange: (value: string) => void;
  
  /**
   * Callback when editor is mounted
   */
  onEditorDidMount: MonacoEditorProps['onMount'];
  
  /**
   * Whether collaboration features are enabled
   */
  enabled?: boolean;
  
  /**
   * Whether to show the chat panel
   */
  showChat?: boolean;
  
  /**
   * Additional class name
   */
  className?: string;
  
  /**
   * Children (typically the Monaco Editor)
   */
  children: React.ReactNode;
}

export const CollaborationWrapper: React.FC<CollaborationWrapperProps> = ({
  documentId,
  filePath,
  user,
  value,
  onChange,
  onEditorDidMount,
  enabled = true,
  showChat = true,
  className = '',
  children,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Record<string, any>>({});
  const [selections, setSelections] = useState<Record<string, any>>({});
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize collaboration service
  const collaboration = useCollaboration({
    enabled,
    documentId,
    user,
    onRemoteChange: (content) => {
      // Only update if the content is different to avoid cursor jumps
      if (content !== value) {
        onChange(content);
      }
    },
    onUserJoined: (user) => {
      console.log(`User joined: ${user.name}`);
    },
    onUserLeft: (userId) => {
      console.log(`User left: ${userId}`);
      // Clean up cursor and selection for the user who left
      setCursorPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[userId];
        return newPositions;
      });
      setSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[userId];
        return newSelections;
      });
    },
    onChatMessage: (message) => {
      console.log(`New chat message from ${message.from.name}: ${message.content}`);
    },
  });

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Forward to parent's onEditorDidMount if provided
    if (onEditorDidMount) {
      onEditorDidMount(editor, monaco);
    }
    
    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e: any) => {
      if (!enabled || !collaboration.service) return;
      
      const position = {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      };
      
      collaboration.updateCursorPosition(position, filePath);
    });
    
    // Set up selection tracking
    editor.onDidChangeCursorSelection((e: any) => {
      if (!enabled || !collaboration.service) return;
      
      const selection = e.selection;
      if (
        selection.startLineNumber === selection.endLineNumber &&
        selection.startColumn === selection.endColumn
      ) {
        // This is just a cursor move, not a selection
        return;
      }
      
      collaboration.updateSelection(selection, filePath);
    });
    
    // Set up content change tracking
    let changeTimeout: NodeJS.Timeout;
    editor.onDidChangeModelContent((e: any) => {
      if (!enabled || !collaboration.service) return;
      
      // Debounce changes to avoid sending too many updates
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        const changes = e.changes.map((change: any) => ({
          range: {
            start: change.rangeOffset,
            end: change.rangeOffset + change.rangeLength,
          },
          text: change.text,
        }));
        
        collaboration.applyLocalChanges(changes, filePath);
      }, 100);
    });
  };
  
  // Handle cursor updates from other users
  useEffect(() => {
    if (!enabled || !collaboration.service) return;
    
    const handleCursorUpdate = (message: any) => {
      if (message.type === 'cursor' && message.from !== user.id) {
        setCursorPositions(prev => ({
          ...prev,
          [message.from]: message.payload.position,
        }));
      }
    };
    
    // Listen for cursor updates
    collaboration.service.on('cursor', handleCursorUpdate);
    
    return () => {
      collaboration.service?.off('cursor', handleCursorUpdate);
    };
  }, [enabled, collaboration.service, user.id]);
  
  // Handle selection updates from other users
  useEffect(() => {
    if (!enabled || !collaboration.service) return;
    
    const handleSelectionUpdate = (message: any) => {
      if (message.type === 'selection' && message.from !== user.id) {
        setSelections(prev => ({
          ...prev,
          [message.from]: message.payload.selection,
        }));
      }
    };
    
    // Listen for selection updates
    collaboration.service?.on('selection', handleSelectionUpdate);
    
    return () => {
      collaboration.service?.off('selection', handleSelectionUpdate);
    };
  }, [enabled, collaboration.service, user.id]);
  
  // Update active users when they change
  useEffect(() => {
    if (!enabled || !collaboration.service) return;
    
    setActiveUsers(collaboration.service.getActiveUsers());
    
    const handlePresenceUpdate = () => {
      setActiveUsers(collaboration.service?.getActiveUsers() || []);
    };
    
    collaboration.service.on('presence', handlePresenceUpdate);
    
    return () => {
      collaboration.service?.off('presence', handlePresenceUpdate);
    };
  }, [enabled, collaboration.service]);
  
  // Toggle chat panel
  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };
  
  // Format users with their cursor and selection data
  const usersWithCursors = activeUsers.map(user => ({
    user,
    cursor: cursorPositions[user.id],
    selection: selections[user.id],
  }));
  
  return (
    <div 
      ref={containerRef}
      className={`collaboration-wrapper ${className}`}
      style={{ position: 'relative', height: '100%', display: 'flex' }}
    >
      {/* Main editor area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {React.cloneElement(children as React.ReactElement, {
          onMount: handleEditorDidMount,
          value,
          onChange: (value: string | undefined) => {
            if (value !== undefined) {
              onChange(value);
            }
          },
        })}
        
        {/* Collaboration overlay for cursors and selections */}
        {enabled && (
          <CollaborationOverlay
            editorContainerRef={containerRef}
            users={usersWithCursors}
            filePath={filePath}
            showCursors={true}
            showSelections={true}
            onUserClick={(userId) => {
              // Focus the user's cursor position
              const cursor = cursorPositions[userId];
              if (cursor && editorRef.current) {
                editorRef.current.revealPositionInCenter(cursor);
                editorRef.current.setPosition(cursor);
                editorRef.current.focus();
              }
            }}
          />
        )}
        
        {/* User presence indicator */}
        {enabled && activeUsers.length > 0 && (
          <div 
            className="user-presence"
            style={{
              position: 'absolute',
              bottom: '10px',
              right: showChat && isChatOpen ? '320px' : '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
              transition: 'right 0.2s ease',
            }}
          >
            {activeUsers.map(user => (
              <div 
                key={user.id}
                className="user-avatar"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: user.color || '#0078d4',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title={user.name}
                onClick={() => {
                  // Focus the user's cursor position
                  const cursor = cursorPositions[user.id];
                  if (cursor && editorRef.current) {
                    editorRef.current.revealPositionInCenter(cursor);
                    editorRef.current.setPosition(cursor);
                    editorRef.current.focus();
                  }
                }}
              >
                {user.name.charAt(0).toUpperCase()}
                <div 
                  className="status-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%',
                    border: '2px solid white',
                  }}
                />
              </div>
            ))}
            {showChat && (
              <button 
                onClick={toggleChat}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  marginLeft: '4px',
                  borderRadius: '4px',
                }}
                title={isChatOpen ? 'Hide chat' : 'Show chat'}
              >
                💬
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Chat panel */}
      {showChat && enabled && (
        <CollaborationChat
          isOpen={isChatOpen}
          onToggle={toggleChat}
          currentUser={user}
          users={activeUsers}
        />
      )}
      
      <style jsx global>{`
        /* Global styles for collaboration features */
        .collaboration-cursor {
          position: absolute;
          width: 2px;
          height: 1.2em;
          background-color: #0078d4;
          z-index: 10;
          pointer-events: none;
        }
        
        .cursor-tooltip {
          position: absolute;
          bottom: 100%;
          left: 0;
          padding: 2px 6px;
          background: #0078d4;
          color: white;
          border-radius: 3px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translateY(5px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        
        .collaboration-cursor:hover .cursor-tooltip {
          opacity: 1;
          transform: translateY(0);
        }
        
        .collaboration-selection {
          background-color: rgba(0, 120, 212, 0.1) !important;
          position: relative;
        }
        
        .collaboration-selection::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #0078d4;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .collaboration-wrapper {
            flex-direction: column;
          }
          
          .collaboration-chat {
            height: 300px;
            border-top: 1px solid #e5e7eb;
            border-left: none;
          }
        }
      `}</style>
    </div>
  );
};
