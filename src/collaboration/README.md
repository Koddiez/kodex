# Real-time Collaboration Features

This module provides real-time collaboration features for the Kodex editor, including multi-user text editing, presence indicators, real-time chat, and user presence tracking.

## Components

### 1. CollaborationService

The core service that manages WebSocket connections and handles real-time communication.

```typescript
import { CollaborationService } from './CollaborationService';

const service = new CollaborationService({
  enabled: true,
  user: {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://...',
  },
  document: {
    id: 'doc-123',
    title: 'My Document',
    language: 'typescript',
  },
  serverUrl: 'wss://your-collab-server.com',
});

// Connect to the collaboration server
service.connect();

// Send a chat message
service.sendChatMessage('Hello, world!');

// Update cursor position
service.updateCursor(
  { lineNumber: 10, column: 5 },
  'src/components/App.tsx'
);

// Apply changes to the document
service.applyLocalChanges(
  [
    {
      range: { start: 0, end: 5 },
      text: 'Hello',
    },
  ],
  'src/components/App.tsx'
);
```

### 2. useCollaboration Hook

A React hook that provides an easy way to integrate collaboration features into your components.

```typescript
import { useCollaboration } from '../hooks/useCollaboration';

function MyEditor() {
  const {
    isConnected,
    activeUsers,
    updateCursorPosition,
    updateSelection,
    sendChatMessage,
    applyLocalChanges,
  } = useCollaboration({
    enabled: true,
    documentId: 'doc-123',
    user: {
      id: 'user-123',
      name: 'John Doe',
    },
    onRemoteChange: (content) => {
      // Handle remote content changes
    },
  });
  
  // Use these values and methods in your component
}
```

### 3. CollaborationWrapper

A component that wraps the Monaco Editor and adds collaboration features.

```typescript
import { CollaborationWrapper } from '../components/CollaborationWrapper';
import Editor from '@monaco-editor/react';

function CollaborativeEditor() {
  const [code, setCode] = useState('// Start coding...');
  
  return (
    <CollaborationWrapper
      documentId="doc-123"
      filePath="src/App.tsx"
      user={{
        id: 'user-123',
        name: 'John Doe',
        color: '#0078d4',
      }}
      value={code}
      onChange={setCode}
      enabled={true}
      showChat={true}
    >
      <Editor
        height="90vh"
        defaultLanguage="typescript"
        value={code}
        onChange={(value) => setCode(value || '')}
      />
    </CollaborationWrapper>
  );
}
```

### 4. CollaborationOverlay

A component that displays cursors and selections of other users in the editor.

```typescript
import { CollaborationOverlay } from '../components/CollaborationOverlay';

function EditorWithOverlay() {
  const editorRef = useRef(null);
  const [users, setUsers] = useState([
    {
      user: {
        id: 'user-123',
        name: 'John Doe',
        color: '#0078d4',
      },
      cursor: { lineNumber: 10, column: 5 },
      selection: {
        startLineNumber: 10,
        startColumn: 5,
        endLineNumber: 12,
        endColumn: 8,
      },
    },
  ]);
  
  return (
    <div ref={editorRef} style={{ position: 'relative', height: '100%' }}>
      <MonacoEditor
        onMount={(editor) => {
          // Set up editor
        }}
      />
      <CollaborationOverlay
        editorContainerRef={editorRef}
        users={users}
        filePath="src/App.tsx"
        onUserClick={(userId) => {
          // Handle user click (e.g., focus their cursor)
        }}
      />
    </div>
  );
}
```

## Setup

1. Install the required dependencies:

```bash
npm install @monaco-editor/react socket.io-client
```

2. Set up a WebSocket server for real-time communication. You can use the provided server implementation or set up your own.

3. Configure the collaboration service with your WebSocket server URL:

```typescript
const service = new CollaborationService({
  serverUrl: 'wss://your-collab-server.com',
  // ...other options
});
```

## Features

### Real-time Editing

Multiple users can edit the same document simultaneously. Changes are synchronized in real-time using operational transformation to handle conflicts.

### Presence Indicators

See where other users are working in the document with their cursors and selections.

### User Presence

Track who is currently viewing or editing the document.

### Chat

Communicate with other users in real-time with the built-in chat.

## Customization

You can customize the appearance and behavior of the collaboration features using the available props and CSS variables.

## License

MIT
