import React, { useState, useRef, useEffect } from 'react';
import { User } from '../collaboration/types';
import { useCollaboration } from '../hooks/useCollaboration';

interface ChatMessage {
  id: string;
  from: User;
  content: string;
  timestamp: Date;
  replyTo?: string;
  mentions?: string[];
}

interface CollaborationChatProps {
  /**
   * Whether the chat panel is visible
   */
  isOpen: boolean;
  
  /**
   * Callback when the chat panel is toggled
   */
  onToggle: () => void;
  
  /**
   * Current user
   */
  currentUser: User;
  
  /**
   * List of active users in the session
   */
  users: User[];
  
  /**
   * Optional class name for the chat container
   */
  className?: string;
}

export const CollaborationChat: React.FC<CollaborationChatProps> = ({
  isOpen,
  onToggle,
  currentUser,
  users,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendChatMessage } = useCollaboration({
    enabled: true,
    documentId: 'global-chat',
    user: currentUser,
    onChatMessage: (message) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        from: message.from,
        content: message.content,
        timestamp: message.timestamp,
      }]);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle mention detection in input
  useEffect(() => {
    if (!inputValue.includes('@')) {
      setIsMentioning(false);
      return;
    }

    const lastAtPos = inputValue.lastIndexOf('@');
    const textAfterAt = inputValue.substring(lastAtPos + 1);
    
    if (textAfterAt.length > 0) {
      setIsMentioning(true);
      setMentionQuery(textAfterAt);
    } else {
      setIsMentioning(false);
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;
    
    // Extract mentions from message
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(trimmedValue)) !== null) {
      const username = match[1];
      const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
      if (user) {
        mentions.push(user.id);
      }
    }
    
    // Send message
    sendChatMessage(trimmedValue, undefined, mentions);
    
    // Clear input
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleMentionSelect = (user: User) => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;
    const value = input.value;
    
    // Find the last @ symbol before the cursor
    const lastAtPos = value.lastIndexOf('@', startPos - 1);
    
    if (lastAtPos === -1) return;
    
    // Replace the @mention query with the username
    const newValue = 
      value.substring(0, lastAtPos) + 
      `@${user.name} ` + 
      value.substring(endPos);
    
    setInputValue(newValue);
    setIsMentioning(false);
    
    // Focus the input and position the cursor after the mention
    setTimeout(() => {
      if (!inputRef.current) return;
      
      const cursorPos = lastAtPos + user.name.length + 2; // +2 for @ and space
      inputRef.current.focus();
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  // Filter users for mention suggestions
  const filteredUsers = users.filter(user => 
    user.id !== currentUser.id &&
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Format message timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if a message is from the current user
  const isCurrentUser = (userId: string) => userId === currentUser.id;

  return (
    <div className={`collaboration-chat ${className} ${isOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <h3>Collaboration Chat</h3>
        <button 
          className="toggle-button" 
          onClick={onToggle}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {isOpen ? '×' : '💬'}
        </button>
      </div>
      
      {isOpen && (
        <>
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>No messages yet. Say hello to your team!</p>
              </div>
            ) : (
              <div className="messages">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`message ${isCurrentUser(message.from.id) ? 'sent' : 'received'}`}
                  >
                    <div className="message-header">
                      <span 
                        className="user-name" 
                        style={{ color: message.from.color || '#0078d4' }}
                      >
                        {message.from.name}
                      </span>
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content.split(/(@\w+)/g).map((part, i) => {
                        if (part.startsWith('@')) {
                          const username = part.substring(1);
                          const user = users.find(u => 
                            u.name.toLowerCase() === username.toLowerCase()
                          );
                          
                          if (user) {
                            return (
                              <span 
                                key={i} 
                                className="mention"
                                style={{
                                  backgroundColor: `${user.color || '#0078d4'}22`,
                                  borderColor: user.color || '#0078d4',
                                }}
                              >
                                {part}
                              </span>
                            );
                          }
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="message-form">
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message... @mention to tag someone"
                className="message-input"
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!inputValue.trim()}
              >
                Send
              </button>
            </div>
            
            {isMentioning && filteredUsers.length > 0 && (
              <div className="mention-suggestions">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="mention-suggestion"
                    onClick={() => handleMentionSelect(user)}
                  >
                    <div 
                      className="user-avatar" 
                      style={{ backgroundColor: user.color || '#0078d4' }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name">{user.name}</span>
                    {user.email && <span className="user-email">{user.email}</span>}
                  </div>
                ))}
              </div>
            )}
          </form>
        </>
      )}
      
      <style jsx>{`
        .collaboration-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-left: 1px solid #e5e7eb;
          background-color: #fff;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }
        
        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        
        .toggle-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          color: #6b7280;
        }
        
        .toggle-button:hover {
          background-color: #e5e7eb;
          color: #111827;
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        
        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #6b7280;
          text-align: center;
          padding: 20px;
        }
        
        .messages {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .message {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 8px;
          position: relative;
        }
        
        .message.sent {
          align-self: flex-end;
          background-color: #3b82f6;
          color: white;
          border-top-right-radius: 0;
        }
        
        .message.received {
          align-self: flex-start;
          background-color: #f3f4f6;
          color: #111827;
          border-top-left-radius: 0;
        }
        
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          font-size: 12px;
        }
        
        .message.sent .message-header {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .message.received .message-header {
          color: #6b7280;
        }
        
        .user-name {
          font-weight: 600;
          margin-right: 8px;
        }
        
        .message-time {
          opacity: 0.8;
        }
        
        .message-content {
          word-wrap: break-word;
          line-height: 1.5;
        }
        
        .mention {
          padding: 0 4px;
          border-radius: 4px;
          font-weight: 500;
          border: 1px solid;
          margin: 0 1px;
        }
        
        .message-form {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          position: relative;
        }
        
        .input-container {
          display: flex;
          gap: 8px;
        }
        
        .message-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .message-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        .send-button {
          padding: 0 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .send-button:hover {
          background-color: #2563eb;
        }
        
        .send-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .mention-suggestions {
          position: absolute;
          bottom: 100%;
          left: 16px;
          right: 16px;
          margin-bottom: 8px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-height: 200px;
          overflow-y: auto;
          z-index: 50;
        }
        
        .mention-suggestion {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .mention-suggestion:hover {
          background-color: #f3f4f6;
        }
        
        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
          margin-right: 8px;
          flex-shrink: 0;
        }
        
        .user-name {
          font-weight: 500;
          margin-right: 8px;
        }
        
        .user-email {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .collaboration-chat {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            max-width: 400px;
            transform: translateX(${isOpen ? '0' : '100%'});
            z-index: 100;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          }
          
          .toggle-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #3b82f6;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 90;
          }
        }
      `}</style>
    </div>
  );
};
