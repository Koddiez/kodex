import React, { useState, useEffect } from 'react';
import { User, Session, SessionPermission } from '../collaboration/types';

interface SessionManagerProps {
  /**
   * Current session information
   */
  session: Session;
  
  /**
   * Current user information
   */
  currentUser: User;
  
  /**
   * List of active users in the session
   */
  users: User[];
  
  /**
   * Callback when the session is updated
   */
  onUpdateSession: (updates: Partial<Session>) => void;
  
  /**
   * Callback when a user is invited to the session
   */
  onInviteUser: (email: string, permissions: SessionPermission[]) => Promise<void>;
  
  /**
   * Callback when a user is removed from the session
   */
  onRemoveUser: (userId: string) => Promise<void>;
  
  /**
   * Callback when permissions are updated for a user
   */
  onUpdatePermissions: (userId: string, permissions: SessionPermission[]) => Promise<void>;
  
  /**
   * Callback when the session is ended
   */
  onEndSession: () => Promise<void>;
  
  /**
   * Whether the session manager is open
   */
  isOpen: boolean;
  
  /**
   * Callback when the session manager is closed
   */
  onClose: () => void;
}

type TabType = 'participants' | 'invite' | 'settings' | 'history';

export const SessionManager: React.FC<SessionManagerProps> = ({
  session,
  currentUser,
  users,
  onUpdateSession,
  onInviteUser,
  onRemoveUser,
  onUpdatePermissions,
  onEndSession,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('participants');
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<SessionPermission[]>(['read', 'write']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState(session.name);
  const [isPublic, setIsPublic] = useState(session.isPublic);

  // Reset form when tab changes
  useEffect(() => {
    setEmail('');
    setError(null);
  }, [activeTab]);

  // Handle session name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionName(e.target.value);
  };

  // Handle session name save
  const handleSaveName = () => {
    onUpdateSession({ name: sessionName });
  };

  // Handle invitation submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      await onInviteUser(email, permissions);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle a permission
  const togglePermission = (permission: SessionPermission) => {
    setPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Format permission label
  const formatPermission = (permission: SessionPermission) => {
    switch (permission) {
      case 'read': return 'View document';
      case 'write': return 'Edit document';
      case 'comment': return 'Add comments';
      case 'share': return 'Invite others';
      case 'admin': return 'Manage session';
      default: return permission;
    }
  };

  // Check if current user is admin
  const isAdmin = session.ownerId === currentUser.id || 
    session.participants.find(p => p.userId === currentUser.id)?.permissions.includes('admin');

  // Available permission options
  const availablePermissions: SessionPermission[] = ['read', 'write', 'comment', 'share', 'admin'];

  if (!isOpen) return null;

  return (
    <div className="session-manager-overlay">
      <div className="session-manager">
        <div className="session-header">
          <h2>Session Settings</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="session-tabs">
          <button
            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
          <button
            className={`tab-button ${activeTab === 'invite' ? 'active' : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            Invite
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'participants' && (
            <div className="participants-list">
              <div className="participant-item header">
                <div>Name</div>
                <div>Email</div>
                <div>Status</div>
                <div>Permissions</div>
                <div>Actions</div>
              </div>
              
              {users.map(user => {
                const participant = session.participants.find(p => p.userId === user.id) || {
                  userId: user.id,
                  permissions: ['read'] as SessionPermission[],
                  joinedAt: new Date().toISOString(),
                };
                
                const isCurrentUser = user.id === currentUser.id;
                const isOwner = session.ownerId === user.id;
                
                return (
                  <div key={user.id} className="participant-item">
                    <div className="user-info">
                      <div 
                        className="user-avatar"
                        style={{ backgroundColor: user.color || '#0078d4' }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">
                        {user.name}
                        {isOwner && ' (Owner)'}
                        {isCurrentUser && ' (You)'}
                      </span>
                    </div>
                    <div className="user-email">{user.email || 'No email'}</div>
                    <div className="user-status">
                      <span className={`status-dot ${user.status || 'offline'}`} />
                      {user.status || 'offline'}
                    </div>
                    <div className="user-permissions">
                      {isOwner ? (
                        <span className="permission-tag">Owner</span>
                      ) : (
                        <select
                          value={JSON.stringify(participant.permissions)}
                          onChange={(e) => {
                            const newPermissions = JSON.parse(e.target.value) as SessionPermission[];
                            onUpdatePermissions(user.id, newPermissions);
                          }}
                          disabled={!isAdmin || isCurrentUser}
                        >
                          <option value={JSON.stringify(['read'])}>Viewer</option>
                          <option value={JSON.stringify(['read', 'comment'])}>Commenter</option>
                          <option value={JSON.stringify(['read', 'write', 'comment'])}>Editor</option>
                          {isAdmin && (
                            <option value={JSON.stringify(['read', 'write', 'comment', 'share'])}>
                              Manager
                            </option>
                          )}
                        </select>
                      )}
                    </div>
                    <div className="user-actions">
                      {!isOwner && isAdmin && !isCurrentUser && (
                        <button
                          className="remove-button"
                          onClick={() => onRemoveUser(user.id)}
                          title="Remove from session"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {activeTab === 'invite' && (
            <div className="invite-tab">
              <form onSubmit={handleInviteSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Permissions</label>
                  <div className="permissions-grid">
                    {availablePermissions.map(permission => (
                      <label key={permission} className="permission-option">
                        <input
                          type="checkbox"
                          checked={permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          disabled={permission === 'admin' && !isAdmin}
                        />
                        {formatPermission(permission)}
                      </label>
                    ))}
                  </div>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
              
              <div className="share-link">
                <h4>Or share this link</h4>
                <div className="link-container">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join/${session.id}`}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/join/${session.id}`
                      );
                      // Show copied tooltip
                    }}
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <div className="link-options">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => {
                        const isPublic = e.target.checked;
                        setIsPublic(isPublic);
                        onUpdateSession({ isPublic });
                      }}
                    />
                    <span className="slider round"></span>
                    <span className="toggle-label">
                      {isPublic ? 'Public (anyone with the link can join)' : 'Private (invite only)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="form-group">
                <label htmlFor="session-name">Session Name</label>
                <div className="input-with-button">
                  <input
                    id="session-name"
                    type="text"
                    value={sessionName}
                    onChange={handleNameChange}
                    disabled={!isAdmin}
                  />
                  {isAdmin && (
                    <button
                      className="save-button"
                      onClick={handleSaveName}
                      disabled={sessionName === session.name}
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label>Session ID</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={session.id}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(session.id);
                      // Show copied tooltip
                    }}
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <div className="danger-actions">
                  <button
                    className="danger-button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to leave this session?')) {
                        await onRemoveUser(currentUser.id);
                      }
                    }}
                  >
                    Leave Session
                  </button>
                  
                  {isAdmin && (
                    <button
                      className="danger-button"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to end this session for all participants?')) {
                          await onEndSession();
                        }
                      }}
                    >
                      End Session for Everyone
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="history-tab">
              <div className="history-list">
                {session.history?.length ? (
                  session.history.map((event, index) => (
                    <div key={index} className="history-item">
                      <div className="history-timestamp">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="history-message">
                        <strong>{event.userName}</strong> {event.action}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No history available</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .session-manager-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        
        .session-manager {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .session-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
          line-height: 1;
        }
        
        .close-button:hover {
          color: #1f2937;
        }
        
        .session-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 16px;
        }
        
        .tab-button {
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }
        
        .tab-button:hover {
          color: #3b82f6;
        }
        
        .tab-button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }
        
        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        /* Participants Tab */
        .participants-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .participant-item {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 2fr 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 6px;
          align-items: center;
        }
        
        .participant-item.header {
          font-weight: 600;
          background-color: #f9fafb;
          padding: 8px 12px;
          border-radius: 4px;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
          flex-shrink: 0;
        }
        
        .user-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-email {
          color: #6b7280;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-dot.online {
          background-color: #10b981;
        }
        
        .status-dot.away {
          background-color: #f59e0b;
        }
        
        .status-dot.offline {
          background-color: #9ca3af;
        }
        
        .user-permissions select {
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          width: 100%;
          max-width: 150px;
        }
        
        .permission-tag {
          background-color: #e5e7eb;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          color: #4b5563;
        }
        
        .remove-button {
          background: none;
          border: 1px solid #ef4444;
          color: #ef4444;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .remove-button:hover {
          background-color: #fee2e2;
        }
        
        /* Invite Tab */
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
        }
        
        .form-group input[type="email"],
        .form-group input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }
        
        .permission-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
          padding: 6px 0;
        }
        
        .permission-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .error-message {
          color: #ef4444;
          font-size: 14px;
          margin-top: 8px;
        }
        
        .form-actions {
          margin-top: 20px;
        }
        
        .primary-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .primary-button:hover {
          background-color: #2563eb;
        }
        
        .primary-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .share-link {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        
        .share-link h4 {
          margin: 0 0 12px 0;
          font-size: 15px;
        }
        
        .link-container {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .link-container input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
          background-color: #f9fafb;
        }
        
        .copy-button {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0 12px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .copy-button:hover {
          background-color: #e5e7eb;
        }
        
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .toggle-switch input {
          display: none;
        }
        
        .slider {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          background-color: #d1d5db;
          border-radius: 20px;
          transition: 0.4s;
        }
        
        .slider:before {
          content: "";
          position: absolute;
          height: 16px;
          width: 16px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          border-radius: 50%;
          transition: 0.4s;
        }
        
        input:checked + .slider {
          background-color: #3b82f6;
        }
        
        input:checked + .slider:before {
          transform: translateX(16px);
        }
        
        /* Settings Tab */
        .input-with-button {
          display: flex;
          gap: 8px;
        }
        
        .input-with-button input {
          flex: 1;
        }
        
        .save-button {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0 12px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .danger-zone {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #fee2e2;
        }
        
        .danger-zone h3 {
          color: #ef4444;
          margin-top: 0;
          font-size: 16px;
        }
        
        .danger-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }
        
        .danger-button {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .danger-button:hover {
          background-color: #fee2e2;
        }
        
        /* History Tab */
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .history-item {
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        
        .history-timestamp {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .history-message {
          font-size: 14px;
        }
        
        .empty-state {
          color: #6b7280;
          text-align: center;
          padding: 20px 0;
          font-style: italic;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .session-manager {
            width: 95%;
            max-height: 85vh;
          }
          
          .participant-item {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .participant-item.header {
            display: none;
          }
          
          .participant-item > div {
            grid-column: span 2;
          }
          
          .participant-item > div:first-child {
            grid-column: 1 / -1;
            font-weight: 600;
          }
          
          .permissions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
