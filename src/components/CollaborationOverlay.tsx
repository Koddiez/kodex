import React, { useEffect, useRef } from 'react';
import { useMonaco } from '@monaco-editor/react';
import { User, CursorPosition, SelectionRange } from '../collaboration/types';

interface CursorMarker {
  id: string;
  position: CursorPosition;
  user: User;
  element: HTMLDivElement;
}

interface SelectionMarker {
  id: string;
  selection: SelectionRange;
  user: User;
  decorations: string[];
}

interface CollaborationOverlayProps {
  /**
   * Reference to the Monaco editor container
   */
  editorContainerRef: React.RefObject<HTMLDivElement>;
  
  /**
   * Current active users in the session
   */
  users: Array<{
    user: User;
    cursor?: CursorPosition | null;
    selection?: SelectionRange | null;
  }>;
  
  /**
   * Current file path
   */
  filePath: string;
  
  /**
   * Whether to show cursors
   */
  showCursors?: boolean;
  
  /**
   * Whether to show selections
   */
  showSelections?: boolean;
  
  /**
   * Callback when a user's cursor is clicked
   */
  onUserClick?: (userId: string) => void;
}

export const CollaborationOverlay: React.FC<CollaborationOverlayProps> = ({
  editorContainerRef,
  users,
  filePath,
  showCursors = true,
  showSelections = true,
  onUserClick,
}) => {
  const monaco = useMonaco();
  const cursorMarkers = useRef<CursorMarker[]>([]);
  const selectionMarkers = useRef<SelectionMarker[]>([]);
  const editorInstance = useRef<any>(null);
  const decorations = useRef<string[]>([]);
  
  // Initialize editor instance
  useEffect(() => {
    if (!monaco || !editorContainerRef.current) return;
    
    // Find the Monaco editor instance
    const editor = Array.from(editorContainerRef.current.querySelectorAll('.monaco-editor'))
      .map((el: any) => el.__monaco_editor__)
      .find(Boolean);
    
    if (editor) {
      editorInstance.current = editor;
    }
    
    return () => {
      // Clean up markers when component unmounts
      cleanupMarkers();
      editorInstance.current = null;
    };
  }, [monaco, editorContainerRef]);
  
  // Update cursor markers
  useEffect(() => {
    if (!editorInstance.current || !showCursors) return;
    
    const editor = editorInstance.current;
    const contentDomNode = editor.getDomNode();
    if (!contentDomNode) return;
    
    // Remove cursors for users who are no longer active
    cursorMarkers.current = cursorMarkers.current.filter(marker => 
      users.some(u => u.user.id === marker.id)
    );
    
    // Update or add cursors for active users
    users.forEach(({ user, cursor }) => {
      if (!cursor) return;
      
      const existingMarker = cursorMarkers.current.find(m => m.id === user.id);
      
      if (existingMarker) {
        // Update existing cursor
        existingMarker.position = cursor;
        updateCursorPosition(existingMarker);
      } else {
        // Create new cursor
        const cursorElement = document.createElement('div');
        cursorElement.className = 'collaboration-cursor';
        cursorElement.style.position = 'absolute';
        cursorElement.style.width = '2px';
        cursorElement.style.height = '1.2em';
        cursorElement.style.backgroundColor = user.color || '#0078d4';
        cursorElement.style.zIndex = '10';
        cursorElement.style.pointerEvents = 'none';
        
        // Add user info tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'cursor-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '100%';
        tooltip.style.left = '0';
        tooltip.style.padding = '2px 6px';
        tooltip.style.background = user.color || '#0078d4';
        tooltip.style.color = 'white';
        tooltip.style.borderRadius = '3px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.pointerEvents = 'none';
        tooltip.textContent = user.name;
        
        cursorElement.appendChild(tooltip);
        contentDomNode.appendChild(cursorElement);
        
        const marker: CursorMarker = {
          id: user.id,
          position: cursor,
          user,
          element: cursorElement,
        };
        
        cursorMarkers.current.push(marker);
        updateCursorPosition(marker);
        
        // Add click handler to focus user
        if (onUserClick) {
          cursorElement.style.pointerEvents = 'auto';
          cursorElement.style.cursor = 'pointer';
          cursorElement.onclick = (e) => {
            e.stopPropagation();
            onUserClick(user.id);
          };
        }
      }
    });
    
    return () => {
      // Clean up cursor elements
      cursorMarkers.current.forEach(marker => {
        if (marker.element.parentNode) {
          marker.element.parentNode.removeChild(marker.element);
        }
      });
      cursorMarkers.current = [];
    };
  }, [users, showCursors, onUserClick]);
  
  // Update selection markers
  useEffect(() => {
    if (!editorInstance.current || !showSelections) return;
    
    const editor = editorInstance.current;
    const model = editor.getModel();
    if (!model) return;
    
    // Clear existing decorations
    decorations.current = editor.deltaDecorations(
      decorations.current,
      []
    );
    
    // Update selections for active users
    selectionMarkers.current = users
      .filter(user => user.selection)
      .map(({ user, selection }) => {
        if (!selection) return null;
        
        const range = new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
        
        const decorations = editor.deltaDecorations(
          [],
          [
            {
              range,
              options: {
                className: 'collaboration-selection',
                isWholeLine: false,
                inlineClassName: `collaboration-selection-${user.id}`,
                hoverMessage: {
                  value: `**${user.name}** is editing`,
                  isTrusted: true,
                  supportThemeIcons: true,
                },
              },
            },
          ]
        );
        
        // Add CSS for the selection
        const styleId = `collaboration-selection-style-${user.id}`;
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            .collaboration-selection-${user.id} {
              background-color: ${user.color || '#0078d4'}33 !important;
            }
            .collaboration-selection-${user.id}::before {
              content: '';
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 2px;
              background-color: ${user.color || '#0078d4'};
            }
          `;
          document.head.appendChild(style);
        }
        
        return {
          id: user.id,
          selection,
          user,
          decorations,
        };
      })
      .filter(Boolean) as SelectionMarker[];
      
    return () => {
      // Clean up decorations
      if (editorInstance.current) {
        decorations.current = editorInstance.current.deltaDecorations(
          decorations.current,
          []
        );
      }
      selectionMarkers.current = [];
    };
  }, [users, showSelections, monaco]);
  
  // Update cursor position based on editor content changes
  const updateCursorPosition = (marker: CursorMarker) => {
    const { position, element } = marker;
    const editor = editorInstance.current;
    if (!editor) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // Get the pixel position of the cursor
    const { top, left, height } = editor.getTopForPosition(
      position.lineNumber,
      position.column
    );
    
    // Position the cursor element
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.height = `${height}px`;
  };
  
  // Clean up all markers
  const cleanupMarkers = () => {
    // Clean up cursor elements
    cursorMarkers.current.forEach(marker => {
      if (marker.element.parentNode) {
        marker.element.parentNode.removeChild(marker.element);
      }
    });
    cursorMarkers.current = [];
    
    // Clean up selection decorations
    if (editorInstance.current) {
      decorations.current = editorInstance.current.deltaDecorations(
        decorations.current,
        []
      );
    }
    selectionMarkers.current = [];
    
    // Clean up styles
    document.querySelectorAll('style[id^="collaboration-selection-style-"]')
      .forEach(el => el.remove());
  };
  
  return null;
};

// Add global styles for collaboration elements
if (typeof document !== 'undefined' && !document.getElementById('collaboration-styles')) {
  const style = document.createElement('style');
  style.id = 'collaboration-styles';
  style.textContent = `
    .collaboration-cursor {
      transition: opacity 0.3s ease;
      opacity: 0.7;
    }
    .collaboration-cursor:hover {
      opacity: 1;
    }
    .cursor-tooltip {
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .collaboration-cursor:hover .cursor-tooltip {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
}
