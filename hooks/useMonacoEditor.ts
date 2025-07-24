import { useEffect, useRef, useState } from 'react';
import { editor } from 'monaco-editor';
import { configureMonaco, defaultEditorConfig, getLanguageFromPath } from '../config/editor-config';

export interface UseMonacoEditorProps {
  containerRef: React.RefObject<HTMLDivElement>;
  initialValue?: string;
  language?: string;
  path?: string;
  theme?: string;
  onChange?: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
}

export function useMonacoEditor({
  containerRef,
  initialValue = '',
  language: initialLanguage,
  path,
  theme = 'kodex-dark',
  onChange,
  onMount,
  options = {},
}: UseMonacoEditorProps) {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const subscriptionRef = useRef<import('monaco-editor').IDisposable | null>(null);

  // Determine language from path if not explicitly provided
  const language = initialLanguage || (path ? getLanguageFromPath(path) : 'plaintext');

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let editorInstance: editor.IStandaloneCodeEditor | null = null;

    // Dynamically import Monaco Editor
    import('monaco-editor')
      .then((monaco) => {
        if (!mounted) return;

        monacoRef.current = monaco;
        
        // Configure Monaco with our custom settings
        configureMonaco(monaco);
        
        // Set the theme
        monaco.editor.setTheme(theme);

        // Create editor instance
        editorInstance = monaco.editor.create(containerRef.current!, {
          value: initialValue,
          language,
          ...defaultEditorConfig,
          ...options,
        });

        editorRef.current = editorInstance;

        // Set up change subscription
        subscriptionRef.current = editorInstance.onDidChangeModelContent(() => {
          const value = editorInstance?.getValue() || '';
          onChange?.(value);
        });

        // Call onMount callback if provided
        onMount?.(editorInstance);
        
        // Handle window resize
        const resizeObserver = new ResizeObserver(() => {
          editorInstance?.layout();
        });
        
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        setIsEditorReady(true);

      })
      .catch((error) => {
        console.error('Failed to load Monaco Editor:', error);
      });

    return () => {
      mounted = false;
      subscriptionRef.current?.dispose();
      if (editorInstance) {
        editorInstance.dispose();
        editorInstance = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Update editor value when initialValue changes
  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;
    
    const editor = editorRef.current;
    const model = editor.getModel();
    
    if (model && model.getValue() !== initialValue) {
      editor.pushUndoStop();
      // Push the operations to the undo stack and execute them
      editor.executeEdits('update-value', [
        {
          range: model.getFullModelRange(),
          text: initialValue,
        },
      ]);
      editor.pushUndoStop();
    }
  }, [initialValue, isEditorReady]);

  // Update language when it changes
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current) return;
    
    const model = editorRef.current.getModel();
    if (model) {
      monacoRef.current.editor.setModelLanguage(model, language);
    }
  }, [language, isEditorReady]);

  // Update theme when it changes
  useEffect(() => {
    if (!isEditorReady || !monacoRef.current) return;
    
    monacoRef.current.editor.setTheme(theme);
  }, [theme, isEditorReady]);

  // Update options when they change
  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;
    
    editorRef.current.updateOptions({
      ...defaultEditorConfig,
      ...options,
    });
  }, [isEditorReady, options]);

  // Expose editor methods
  const getValue = (): string => {
    return editorRef.current?.getValue() || '';
  };

  const setValue = (value: string): void => {
    if (editorRef.current) {
      editorRef.current.setValue(value);
    }
  };

  const getEditor = (): editor.IStandaloneCodeEditor | null => {
    return editorRef.current;
  };

  return {
    isReady: isEditorReady,
    editor: editorRef.current,
    monaco: monacoRef.current,
    getValue,
    setValue,
    getEditor,
  };
}
