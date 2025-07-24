import { useEffect, useRef, useState } from 'react';
import { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

export interface UseEditorDebuggingProps {
  editor: editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  model: editor.ITextModel | null;
  language: string;
  onBreakpointHit?: (breakpoint: DebugBreakpoint) => void;
  onPause?: (position: DebugPosition) => void;
  onException?: (error: DebugException) => void;
  onDebuggerStateChange?: (state: DebuggerState) => void;
}

export interface DebugBreakpoint {
  id: string;
  lineNumber: number;
  column: number;
  condition?: string;
  hitCount?: number;
  enabled: boolean;
}

export interface DebugPosition {
  lineNumber: number;
  column: number;
  source: {
    name: string;
    path: string;
    sourceReference?: number;
  };
}

export interface DebugException {
  id: string;
  message: string;
  position: DebugPosition;
  timestamp: number;
  stackTrace?: string[];
}

export type DebuggerState = 'inactive' | 'running' | 'paused' | 'stepping';

export function useEditorDebugging({
  editor: editorInstance,
  monaco,
  model,
  language,
  onBreakpointHit,
  onPause,
  onException,
  onDebuggerStateChange,
}: UseEditorDebuggingProps) {
  const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([]);
  const [debuggerState, setDebuggerState] = useState<DebuggerState>('inactive');
  const breakpointDecorationIds = useRef<string[]>([]);
  const currentPositionDecorationId = useRef<string | null>(null);
  const debugSessionId = useRef<string>('');
  const breakpointIdCounter = useRef(0);

  // Toggle breakpoint at the given line
  const toggleBreakpoint = (lineNumber: number, condition?: string) => {
    if (!editorInstance || !model) return;

    const existingIndex = breakpoints.findIndex(bp => bp.lineNumber === lineNumber);
    let newBreakpoints = [...breakpoints];

    if (existingIndex >= 0) {
      // Toggle breakpoint
      newBreakpoints.splice(existingIndex, 1);
    } else {
      // Add new breakpoint
      const newBreakpoint: DebugBreakpoint = {
        id: `bp-${++breakpointIdCounter.current}`,
        lineNumber,
        column: 1, // Default to first column
        condition,
        enabled: true,
        hitCount: 0,
      };
      newBreakpoints.push(newBreakpoint);
    }

    setBreakpoints(newBreakpoints);
    updateBreakpointDecorations();
    return newBreakpoints;
  };

  // Update breakpoint decorations in the editor
  const updateBreakpointDecorations = () => {
    if (!editorInstance || !monaco || !model) return;

    // Clear existing breakpoint decorations
    editorInstance.deltaDecorations(breakpointDecorationIds.current, []);
    breakpointDecorationIds.current = [];

    // Add new breakpoint decorations
    const newDecorations = breakpoints
      .filter(bp => bp.enabled)
      .map(breakpoint => ({
        range: new monaco.Range(breakpoint.lineNumber, 1, breakpoint.lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'debug-breakpoint',
          glyphMarginClassName: 'debug-breakpoint-glyph',
          glyphMarginHoverMessage: {
            value: breakpoint.condition 
              ? `Breakpoint (condition: ${breakpoint.condition})` 
              : 'Breakpoint',
          },
        },
      }));

    if (newDecorations.length > 0) {
      breakpointDecorationIds.current = editorInstance.deltaDecorations(
        [],
        newDecorations
      );
    }
  };

  // Set the current execution position
  const setCurrentPosition = (position: DebugPosition | null) => {
    if (!editorInstance || !monaco || !model) return;

    // Clear previous position decoration
    if (currentPositionDecorationId.current) {
      editorInstance.deltaDecorations([currentPositionDecorationId.current], []);
      currentPositionDecorationId.current = null;
    }

    // Add new position decoration if position is provided
    if (position) {
      const decorations = [{
        range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line',
          glyphMarginClassName: 'debug-current-line-glyph',
        },
      }];

      const [decorationId] = editorInstance.deltaDecorations([], decorations);
      currentPositionDecorationId.current = decorationId;

      // Scroll to the current position
      editorInstance.revealLineInCenter(position.lineNumber);
    }
  };

  // Start a new debug session
  const startDebugging = async () => {
    if (debuggerState !== 'inactive') return;
    
    setDebuggerState('running');
    debugSessionId.current = `session-${Date.now()}`;
    
    // Here you would typically connect to a debug adapter or set up a WebSocket connection
    // For now, we'll simulate a running debug session
    
    return debugSessionId.current;
  };

  // Pause execution at the current position
  const pause = () => {
    if (debuggerState !== 'running') return;
    
    setDebuggerState('paused');
    
    // In a real implementation, this would be set by the debug adapter
    const currentLine = editorInstance?.getPosition()?.lineNumber || 1;
    setCurrentPosition({
      lineNumber: currentLine,
      column: 1,
      source: {
        name: model?.uri?.path.split('/').pop() || 'unknown',
        path: model?.uri?.path || '',
      },
    });
    
    onPause?.({
      lineNumber: currentLine,
      column: 1,
      source: {
        name: model?.uri?.path.split('/').pop() || 'unknown',
        path: model?.uri?.path || '',
      },
    });
  };

  // Continue execution
  const continueExecution = () => {
    if (debuggerState !== 'paused') return;
    
    setDebuggerState('running');
    setCurrentPosition(null);
    
    // In a real implementation, this would tell the debug adapter to continue
  };

  // Step over the current line
  const stepOver = () => {
    if (debuggerState !== 'paused') return;
    
    setDebuggerState('stepping');
    
    // In a real implementation, this would tell the debug adapter to step over
    // For now, we'll just move to the next line
    const currentLine = editorInstance?.getPosition()?.lineNumber || 1;
    setCurrentPosition({
      lineNumber: currentLine + 1,
      column: 1,
      source: {
        name: model?.uri?.path.split('/').pop() || 'unknown',
        path: model?.uri?.path || '',
      },
    });
    
    // Simulate a small delay for the step
    setTimeout(() => {
      setDebuggerState('paused');
    }, 100);
  };

  // Step into the current function
  const stepInto = () => {
    if (debuggerState !== 'paused') return;
    
    setDebuggerState('stepping');
    
    // In a real implementation, this would tell the debug adapter to step into
    // For now, we'll just move to the next line
    const currentLine = editorInstance?.getPosition()?.lineNumber || 1;
    setCurrentPosition({
      lineNumber: currentLine + 1,
      column: 1,
      source: {
        name: model?.uri?.path.split('/').pop() || 'unknown',
        path: model?.uri?.path || '',
      },
    });
    
    // Simulate a small delay for the step
    setTimeout(() => {
      setDebuggerState('paused');
    }, 100);
  };

  // Step out of the current function
  const stepOut = () => {
    if (debuggerState !== 'paused') return;
    
    setDebuggerState('stepping');
    
    // In a real implementation, this would tell the debug adapter to step out
    // For now, we'll just move to the next line
    const currentLine = editorInstance?.getPosition()?.lineNumber || 1;
    setCurrentPosition({
      lineNumber: currentLine + 3, // Simulate stepping out
      column: 1,
      source: {
        name: model?.uri?.path.split('/').pop() || 'unknown',
        path: model?.uri?.path || '',
      },
    });
    
    // Simulate a small delay for the step
    setTimeout(() => {
      setDebuggerState('paused');
    }, 100);
  };

  // Stop debugging
  const stopDebugging = () => {
    if (debuggerState === 'inactive') return;
    
    setDebuggerState('inactive');
    setCurrentPosition(null);
    debugSessionId.current = '';
    
    // In a real implementation, this would disconnect from the debug adapter
  };

  // Get variables in the current scope
  const getVariables = async (): Promise<Record<string, any>> => {
    if (debuggerState !== 'paused') return {};
    
    // In a real implementation, this would query the debug adapter for variables
    // For now, return mock data
    return {
      this: 'window',
      arguments: [],
      local: {
        count: 0,
        items: ['item1', 'item2', 'item3'],
        user: {
          name: 'John Doe',
          age: 30,
          active: true,
        },
      },
      global: {
        window: 'Window',
        document: 'Document',
        console: 'Console',
      },
    };
  };

  // Evaluate an expression in the current debug context
  const evaluate = async (expression: string): Promise<{ result: any; type: string }> => {
    if (debuggerState !== 'paused') {
      throw new Error('Not in a debugging session');
    }
    
    // In a real implementation, this would send the expression to the debug adapter
    // For now, just evaluate it in a safe way
    try {
      // This is a simplified evaluation - in a real app, you'd want to evaluate in the debug context
      const result = new Function(`return (${expression})`)();
      return {
        result,
        type: typeof result,
      };
    } catch (error) {
      return {
        result: error instanceof Error ? error.message : String(error),
        type: 'error',
      };
    }
  };

  // Handle editor click in the glyph margin (for breakpoints)
  useEffect(() => {
    if (!editorInstance) return;

    const disposable = editorInstance.onMouseDown((e) => {
      if (e.target.type === editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          toggleBreakpoint(lineNumber);
        }
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [editorInstance, breakpoints]);

  // Update debugger state when it changes
  useEffect(() => {
    onDebuggerStateChange?.(debuggerState);
  }, [debuggerState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopDebugging();
    };
  }, []);

  return {
    // State
    breakpoints,
    debuggerState,
    debugSessionId: debugSessionId.current,
    
    // Breakpoints
    toggleBreakpoint,
    setBreakpointCondition: (breakpointId: string, condition: string) => {
      setBreakpoints(prev => 
        prev.map(bp => 
          bp.id === breakpointId ? { ...bp, condition } : bp
        )
      );
    },
    toggleBreakpointEnabled: (breakpointId: string) => {
      setBreakpoints(prev => 
        prev.map(bp => 
          bp.id === breakpointId ? { ...bp, enabled: !bp.enabled } : bp
        )
      );
    },
    removeBreakpoint: (breakpointId: string) => {
      setBreakpoints(prev => prev.filter(bp => bp.id !== breakpointId));
    },
    
    // Debug control
    startDebugging,
    pause,
    continue: continueExecution,
    stepOver,
    stepInto,
    stepOut,
    stop: stopDebugging,
    
    // Debug info
    getVariables,
    evaluate,
    
    // Position
    setCurrentPosition,
  };
}
