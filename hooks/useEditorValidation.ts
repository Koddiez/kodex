import { useEffect, useRef } from 'react';
import { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

export interface UseEditorValidationProps {
  editor: editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  model: editor.ITextModel | null;
  language: string;
  enableTypeChecking?: boolean;
  enableESLint?: boolean;
  enableStyleLint?: boolean;
  tsConfig?: any;
  eslintConfig?: any;
  styleLintConfig?: any;
  onErrors?: (errors: EditorError[]) => void;
  onWarnings?: (warnings: EditorWarning[]) => void;
  onSuggestions?: (suggestions: EditorSuggestion[]) => void;
}

export interface EditorError {
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  source?: string;
}

export interface EditorWarning extends Omit<EditorError, 'severity'> {
  severity: 'warning';
}

export interface EditorSuggestion extends Omit<EditorError, 'severity'> {
  severity: 'suggestion';
  suggestion: string;
  action?: () => void;
}

export function useEditorValidation({
  editor: editorInstance,
  monaco,
  model,
  language,
  enableTypeChecking = true,
  enableESLint = true,
  enableStyleLint = true,
  tsConfig = {},
  eslintConfig = {},
  styleLintConfig = {},
  onErrors,
  onWarnings,
  onSuggestions,
}: UseEditorValidationProps) {
  const markersSubscription = useRef<import('monaco-editor').IDisposable | null>(null);
  const modelMarkers = useRef<editor.IMarkerData[]>([]);
  const lastValidationTime = useRef<number>(0);
  const validationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize validation
  useEffect(() => {
    if (!monaco || !model || !editorInstance) return;

    // Configure TypeScript/JavaScript language features
    if (['typescript', 'javascript'].includes(language)) {
      configureTypeScript(monaco, model, enableTypeChecking, tsConfig);
    }

    // Set up model markers change listener
    markersSubscription.current = monaco.editor.onDidChangeMarkers((uris) => {
      const currentModelUri = model.uri;
      if (uris.some(uri => uri.toString() === currentModelUri.toString())) {
        updateMarkers(monaco, model.uri);
      }
    });

    // Initial validation
    validateContent();

    // Set up content change listener with debounce
    const changeSubscription = editorInstance.onDidChangeModelContent(() => {
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current);
      }

      validationTimeout.current = setTimeout(() => {
        validateContent();
      }, 500);
    });

    return () => {
      markersSubscription.current?.dispose();
      changeSubscription.dispose();
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current);
      }
    };
  }, [monaco, model, editorInstance, language]);

  // Update markers when configuration changes
  useEffect(() => {
    if (!monaco || !model) return;
    
    // Re-validate when validation settings change
    validateContent();
  }, [enableTypeChecking, enableESLint, enableStyleLint, tsConfig, eslintConfig, styleLintConfig]);

  const updateMarkers = (monaco: Monaco, uri: any) => {
    if (!model) return;
    
    const markers = monaco.editor.getModelMarkers({ resource: uri });
    modelMarkers.current = markers;
    
    const errors: EditorError[] = [];
    const warnings: EditorWarning[] = [];
    
    markers.forEach(marker => {
      const error: EditorError = {
        message: marker.message,
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
        severity: marker.severity === 8 ? 'error' : marker.severity === 4 ? 'warning' : 'info',
        code: marker.code?.toString(),
        source: marker.source,
      };
      
      if (error.severity === 'error') {
        errors.push(error);
      } else if (error.severity === 'warning') {
        warnings.push(error as EditorWarning);
      }
    });
    
    onErrors?.(errors);
    onWarnings?.(warnings);
    
    // Generate suggestions based on errors and warnings
    generateSuggestions(errors, warnings);
  };

  const validateContent = async () => {
    if (!monaco || !model || !editorInstance) return;
    
    const now = Date.now();
    if (now - lastValidationTime.current < 300) {
      // Avoid too frequent validations
      return;
    }
    lastValidationTime.current = now;
    
    // Clear existing markers
    monaco.editor.setModelMarkers(model, 'owner', []);
    
    try {
      // TypeScript/JavaScript validation
      if (['typescript', 'javascript'].includes(language)) {
        await validateTypeScript(monaco, model, enableTypeChecking);
      }
      
      // ESLint validation
      if (enableESLint && ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
        await validateWithESLint(monaco, model, eslintConfig);
      }
      
      // StyleLint validation
      if (enableStyleLint && ['css', 'scss', 'less'].includes(language)) {
        await validateWithStyleLint(monaco, model, styleLintConfig);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const generateSuggestions = (errors: EditorError[], warnings: EditorWarning[]) => {
    if (!onSuggestions) return;
    
    const suggestions: EditorSuggestion[] = [];
    
    // Generate suggestions based on errors and warnings
    [...errors, ...warnings].forEach(issue => {
      // Example: Suggest fixes for common issues
      if (issue.code === '2304' && issue.message.includes('Cannot find')) {
        const match = issue.message.match(/Cannot find name '(.+?)'\./);
        if (match) {
          const varName = match[1];
          suggestions.push({
            ...issue,
            severity: 'suggestion',
            suggestion: `Add '${varName}' to the current scope or import it if it's from another module.`,
            action: () => {
              // This would be implemented to actually fix the issue
              console.log(`Would fix missing variable: ${varName}`);
            }
          });
        }
      }
      
      // Add more suggestion patterns as needed
    });
    
    onSuggestions(suggestions);
  };

  // Helper functions for different validation types
  async function validateTypeScript(
    monaco: Monaco,
    model: editor.ITextModel,
    enableTypeChecking: boolean
  ) {
    if (!enableTypeChecking) return;
    
    // Get TypeScript worker
    const worker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await worker(model.uri);
    
    // Get semantic diagnostics
    const diagnostics = await client.getSemanticDiagnostics(model.uri.toString());
    
    // Convert diagnostics to markers
    const markers = diagnostics.map(diagnostic => ({
      ...diagnostic,
      severity: monaco.MarkerSeverity.Error,
      source: 'typescript',
    }));
    
    // Add markers to the editor
    monaco.editor.setModelMarkers(model, 'typescript', markers);
  }
  
  async function validateWithESLint(
    monaco: Monaco,
    model: editor.ITextModel,
    eslintConfig: any
  ) {
    // This would be implemented to use ESLint for additional validation
    // For now, it's a placeholder
    console.log('ESLint validation would run here with config:', eslintConfig);
  }
  
  async function validateWithStyleLint(
    monaco: Monaco,
    model: editor.ITextModel,
    styleLintConfig: any
  ) {
    // This would be implemented to use StyleLint for CSS/SCSS validation
    // For now, it's a placeholder
    console.log('StyleLint validation would run here with config:', styleLintConfig);
  }
  
  function configureTypeScript(
    monaco: Monaco,
    model: editor.ITextModel,
    enableTypeChecking: boolean,
    tsConfig: any
  ) {
    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
      ...tsConfig,
      noEmit: true, // We don't need to emit files
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      alwaysStrict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      checkJs: true,
    });
    
    // Add type definitions
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      'declare const React: typeof import("react");',
      'react.d.ts'
    );
  }
  
  return {
    validate: validateContent,
    clearMarkers: () => {
      if (monaco && model) {
        monaco.editor.setModelMarkers(model, 'validation', []);
      }
    },
  };
}
