import { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { useMonacoEditor } from '../hooks/useMonacoEditor';
import { useEditorValidation } from '../hooks/useEditorValidation';
import { useEditorDebugging } from '../hooks/useEditorDebugging';
import { RefactoringTools } from '../lib/refactoring-tools';
import { getLanguageFromPath } from '../config/editor-config';

interface EnhancedMonacoEditorProps {
  /** Initial editor value */
  value: string;
  
  /** Called when editor content changes */
  onChange?: (value: string) => void;
  
  /** File path for language detection and debugging */
  path?: string;
  
  /** Language ID (overrides detection from path) */
  language?: string;
  
  /** Editor theme */
  theme?: 'vs-dark' | 'light' | 'kodex-dark' | 'kodex-light';
  
  /** Whether to enable code validation */
  enableValidation?: boolean;
  
  /** Whether to enable debugging features */
  enableDebugging?: boolean;
  
  /** Whether to enable refactoring tools */
  enableRefactoring?: boolean;
  
  /** Custom editor options */
  options?: any;
  
  /** Class name for the container */
  className?: string;
  
  /** Callback when editor is mounted */
  onMount?: (editor: any, monaco: Monaco) => void;
}

export function EnhancedMonacoEditor({
  value,
  onChange,
  path = '',
  language: propLanguage,
  theme = 'kodex-dark',
  enableValidation = true,
  enableDebugging = true,
  enableRefactoring = true,
  options = {},
  className = '',
  onMount: onMountProp,
}: EnhancedMonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const refactoringToolsRef = useRef<RefactoringTools | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Determine language from path or prop
  const detectedLanguage = path ? getLanguageFromPath(path) : 'plaintext';
  const language = propLanguage || detectedLanguage;
  
  // State for validation and debugging
  const [errors, setErrors] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [debuggerState, setDebuggerState] = useState<'inactive' | 'running' | 'paused' | 'stepping'>('inactive');
  const [breakpoints, setBreakpoints] = useState<any[]>([]);
  const [variables, setVariables] = useState<Record<string, any>>({});
  
  // Initialize Monaco Editor
  const { editor: monacoEditor, monaco, isReady } = useMonacoEditor({
    containerRef,
    initialValue: value,
    language,
    theme,
    options,
  });
  
  // Set up validation
  const { validate } = useEditorValidation({
    editor: monacoEditor,
    monaco,
    model: monacoEditor?.getModel() || null,
    language,
    onErrors: setErrors,
    onWarnings: setWarnings,
    onSuggestions: setSuggestions,
  });
  
  // Set up debugging
  const {
    startDebugging,
    pause,
    continue: continueExecution,
    stepOver,
    stepInto,
    stepOut,
    stop: stopDebugging,
    setCurrentPosition,
    getVariables: fetchVariables,
    toggleBreakpoint,
  } = useEditorDebugging({
    editor: monacoEditor,
    monaco,
    model: monacoEditor?.getModel() || null,
    language,
    onBreakpointHit: (breakpoint) => {
      console.log('Breakpoint hit:', breakpoint);
      setDebuggerState('paused');
      // Update variables when hitting a breakpoint
      updateVariables();
    },
    onPause: (position) => {
      console.log('Paused at:', position);
      setDebuggerState('paused');
      updateVariables();
    },
    onException: (error) => {
      console.error('Debugger exception:', error);
      setDebuggerState('paused');
      updateVariables();
    },
    onDebuggerStateChange: setDebuggerState,
  });
  
  // Update variables in the debugger
  const updateVariables = useCallback(async () => {
    if (debuggerState === 'paused') {
      const vars = await fetchVariables();
      setVariables(vars);
    }
  }, [debuggerState, fetchVariables]);
  
  // Initialize refactoring tools when editor is ready
  useEffect(() => {
    if (monacoEditor && monaco && enableRefactoring) {
      refactoringToolsRef.current = new RefactoringTools(monacoEditor, monaco, {
        updateImports: true,
        updateReferences: true,
      });
      
      // Set up keyboard shortcuts for refactoring
      const disposable = monacoEditor.addAction({
        id: 'show-refactorings',
        label: 'Show Refactorings',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
        run: async () => {
          const refactorings = await refactoringToolsRef.current?.getApplicableRefactorings();
          if (refactorings && refactorings.length > 0) {
            // In a real app, show a context menu or quick picker
            console.log('Available refactorings:', refactorings);
            // For now, just apply the first one
            if (refactorings[0]) {
              refactoringToolsRef.current?.applyRefactoring(refactorings[0].id);
            }
          }
        },
      });
      
      return () => {
        disposable?.dispose();
      };
    }
  }, [monacoEditor, monaco, enableRefactoring]);
  
  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure editor
    if (enableValidation) {
      validate();
    }
    
    // Call the provided onMount handler
    if (onMountProp) {
      onMountProp(editor, monaco);
    }
  };
  
  // Handle value changes
  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
    
    // Re-validate if validation is enabled
    if (enableValidation) {
      validate();
    }
  };
  
  // Toggle breakpoint at the current line
  const handleToggleBreakpoint = () => {
    if (!monacoEditor) return;
    
    const position = monacoEditor.getPosition();
    if (position) {
      toggleBreakpoint(position.lineNumber);
    }
  };
  
  // Debug controls
  const handleStartDebugging = async () => {
    await startDebugging();
  };
  
  const handlePause = () => {
    pause();
  };
  
  const handleContinue = () => {
    continueExecution();
  };
  
  const handleStepOver = () => {
    stepOver();
  };
  
  const handleStepInto = () => {
    stepInto();
  };
  
  const handleStepOut = () => {
    stepOut();
  };
  
  const handleStopDebugging = () => {
    stopDebugging();
    setVariables({});
  };
  
  // Render debug toolbar
  const renderDebugToolbar = () => {
    if (!enableDebugging) return null;
    
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        {debuggerState === 'inactive' ? (
          <button
            onClick={handleStartDebugging}
            className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700 text-white"
            title="Start Debugging (F5)"
          >
            ▶️ Start Debugging
          </button>
        ) : (
          <>
            <button
              onClick={handleStopDebugging}
              className="p-1 text-gray-300 rounded hover:bg-gray-700"
              title="Stop Debugging (Shift+F5)"
            >
              ⏹️ Stop
            </button>
            
            {debuggerState === 'paused' || debuggerState === 'stepping' ? (
              <>
                <button
                  onClick={handleContinue}
                  className="p-1 text-gray-300 rounded hover:bg-gray-700"
                  title="Continue (F5)"
                >
                  ▶️ Continue
                </button>
                <button
                  onClick={handleStepOver}
                  className="p-1 text-gray-300 rounded hover:bg-gray-700"
                  title="Step Over (F10)"
                >
                  ⏭️ Step Over
                </button>
                <button
                  onClick={handleStepInto}
                  className="p-1 text-gray-300 rounded hover:bg-gray-700"
                  title="Step Into (F11)"
                >
                  ⏬ Step Into
                </button>
                <button
                  onClick={handleStepOut}
                  className="p-1 text-gray-300 rounded hover:bg-gray-700"
                  title="Step Out (Shift+F11)"
                >
                  ⏫ Step Out
                </button>
              </>
            ) : (
              <button
                onClick={handlePause}
                className="p-1 text-gray-300 rounded hover:bg-gray-700"
                title="Pause (Ctrl+\,)"
              >
                ⏸️ Pause
              </button>
            )}
            
            <div className="ml-auto text-xs text-gray-400">
              {debuggerState === 'running' && 'Running...'}
              {debuggerState === 'paused' && 'Paused'}
              {debuggerState === 'stepping' && 'Stepping...'}
            </div>
          </>
        )}
      </div>
    );
  };
  
  // Render variables panel
  const renderVariablesPanel = () => {
    if (debuggerState !== 'paused' || Object.keys(variables).length === 0) {
      return null;
    }
    
    const renderValue = (value: any, depth = 0): React.ReactNode => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      
      if (Array.isArray(value)) {
        return (
          <div className="ml-4">
            [
            {value.map((item, i) => (
              <div key={i} className="ml-4">
                {renderValue(item, depth + 1)},
              </div>
            ))}
            ]
          </div>
        );
      }
      
      if (typeof value === 'object') {
        return (
          <div className="ml-4">
            {'{'}
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="ml-4">
                {key}: {renderValue(val, depth + 1)},
              </div>
            ))}
            {'}'}
          </div>
        );
      }
      
      return typeof value === 'string' ? `"${value}"` : String(value);
    };
    
    return (
      <div className="p-2 text-xs bg-gray-900 border-t border-gray-700 overflow-auto max-h-40">
        <div className="font-mono">
          {Object.entries(variables).map(([scope, vars]) => (
            <div key={scope} className="mb-2">
              <div className="font-semibold text-blue-400">{scope}:</div>
              <div className="ml-2">
                {Object.entries(vars as Record<string, any>).map(([name, value]) => (
                  <div key={name} className="flex">
                    <span className="text-purple-400">{name}:</span>
                    <span className="ml-2">{renderValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render status bar
  const renderStatusBar = () => {
    return (
      <div className="flex items-center justify-between px-3 py-1 text-xs bg-gray-900 text-gray-400 border-t border-gray-700">
        <div>
          {language.toUpperCase()} {errors.length > 0 && `• ${errors.length} Errors`} {warnings.length > 0 && `• ${warnings.length} Warnings`}
        </div>
        <div>
          Ln {monacoEditor?.getPosition()?.lineNumber}, Col {monacoEditor?.getPosition()?.column}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Debug toolbar */}
      {renderDebugToolbar()}
      
      {/* Editor container */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            smoothScrolling: true,
            ...options,
          }}
        />
      </div>
      
      {/* Variables panel */}
      {renderVariablesPanel()}
      
      {/* Status bar */}
      {renderStatusBar()}
    </div>
  );
}

export default EnhancedMonacoEditor;
