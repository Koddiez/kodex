import { editor } from 'monaco-editor';

// Define editor theme colors
export const editorThemes = {
  'kodex-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8B5CF6' },
      { token: 'string', foreground: '10B981' },
      { token: 'number', foreground: 'F59E0B' },
      { token: 'type', foreground: '3B82F6' },
      { token: 'function', foreground: 'EC4899' },
    ],
    colors: {
      'editor.background': '#1F2937',
      'editor.foreground': '#F9FAFB',
      'editor.lineHighlightBackground': '#1F2937',
      'editor.lineHighlightBorder': '#374151',
      'editorLineNumber.foreground': '#6B7280',
      'editorLineNumber.activeForeground': '#9CA3AF',
      'editor.selectionBackground': '#4B5563',
      'editor.inactiveSelectionBackground': '#374151',
      'editorCursor.foreground': '#3B82F6',
      'editor.findMatchBackground': '#6B7280',
      'editor.findMatchHighlightBackground': '#4B5563',
      'editorBracketMatch.background': '#4B5563',
      'editorBracketMatch.border': '#6B7280',
      'editorIndentGuide.background': '#374151',
      'editorIndentGuide.activeBackground': '#4B5563',
      'editorSuggestWidget.background': '#1F2937',
      'editorSuggestWidget.border': '#374151',
      'editorSuggestWidget.highlightForeground': '#3B82F6',
    },
  },
  'kodex-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7C3AED' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'D97706' },
      { token: 'type', foreground: '2563EB' },
      { token: 'function', foreground: 'DB2777' },
    ],
    colors: {
      'editor.background': '#F9FAFB',
      'editor.foreground': '#111827',
      'editor.lineHighlightBackground': '#F9FAFB',
      'editor.lineHighlightBorder': '#E5E7EB',
      'editorLineNumber.foreground': '#9CA3AF',
      'editorLineNumber.activeForeground': '#6B7280',
      'editor.selectionBackground': '#DBEAFE',
      'editor.inactiveSelectionBackground': '#E5E7EB',
      'editorCursor.foreground': '#2563EB',
      'editor.findMatchBackground': '#DBEAFE',
      'editor.findMatchHighlightBackground': '#BFDBFE',
      'editorBracketMatch.background': '#DBEAFE',
      'editorBracketMatch.border': '#93C5FD',
      'editorIndentGuide.background': '#E5E7EB',
      'editorIndentGuide.activeBackground': '#D1D5DB',
      'editorSuggestWidget.background': '#FFFFFF',
      'editorSuggestWidget.border': '#E5E7EB',
      'editorSuggestWidget.highlightForeground': '#2563EB',
    },
  },
} as const;

// Default editor options
export const defaultEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontLigatures: true,
  lineNumbers: 'on',
  lineNumbersMinChars: 4,
  lineDecorationsWidth: 10,
  scrollBeyondLastLine: false,
  scrollBeyondLastColumn: 5,
  minimap: {
    enabled: true,
    maxColumn: 80,
    renderCharacters: false,
    showSlider: 'mouseover',
  },
  wordWrap: 'on',
  wrappingIndent: 'indent',
  bracketPairColorization: {
    enabled: true,
  },
  guides: {
    bracketPairs: true,
    bracketPairsHorizontal: true,
    highlightActiveBracketPair: true,
    indentation: true,
    highlightActiveIndentation: true,
  },
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',
  renderIndentGuides: true,
  renderLineHighlightOnlyWhenFocus: false,
  quickSuggestions: {
    other: true,
    comments: false,
    strings: true,
  },
  suggestOnTriggerCharacters: true,
  suggestSelection: 'first',
  tabSize: 2,
  insertSpaces: true,
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  autoSurround: 'languageDefined',
  formatOnPaste: true,
  formatOnType: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: true,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    arrowSize: 14,
  },
  fixedOverflowWidgets: true,
  parameterHints: {
    enabled: true,
  },
  suggest: {
    showClasses: false,
    showColors: true,
    showConstants: true,
    showConstructors: false,
    showCustomcolors: true,
    showDeprecated: true,
    showEnumMembers: true,
    showEvents: false,
    showFields: true,
    showFiles: false,
    showFolders: false,
    showFunctions: true,
    showInterfaces: true,
    showIssues: true,
    showKeywords: true,
    showMethods: true,
    showModules: false,
    showOperators: true,
    showProperties: true,
    showReferences: true,
    showSnippets: true,
    showStructs: false,
    showTypeParameters: true,
    showUsers: true,
    showValues: true,
    showVariables: true,
    showWords: true,
  },
};

// Language configuration overrides
export const languageConfigurations: Record<string, any> = {
  typescript: {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: '\'', close: '\'', notIn: ['string', 'comment'] },
      { open: '`', close: '`', notIn: ['string', 'comment'] },
      { open: '/**', close: ' */', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '\'', close: '\'' },
      { open: '`', close: '`' },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b')
      }
    }
  },
  javascript: {
    ...languageConfigurations.typescript,
  },
  json: {
    wordPattern: /("([^\\"]|\\.)*")?[\s\w\[\]\{\}:,]*/g,
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  },
  css: {
    wordPattern: /(#?[\w-]+|\$[\w-]+|\$\{[^}]+\}|[\w-]+)(?=\s*:)/,
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: '\'', close: '\'', notIn: ['string', 'comment'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '\'', close: '\'' },
    ],
  },
};

// File extensions to language mappings
export const fileExtensions: Record<string, string> = {
  // JavaScript
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'jsx': 'javascript',
  
  // TypeScript
  'ts': 'typescript',
  'tsx': 'typescript',
  'mts': 'typescript',
  'cts': 'typescript',
  
  // CSS
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  
  // HTML
  'html': 'html',
  'htm': 'html',
  
  // JSON
  'json': 'json',
  'jsonc': 'json',
  'json5': 'json',
  
  // Markdown
  'md': 'markdown',
  'markdown': 'markdown',
  'mdx': 'markdown',
  
  // Configuration
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'env': 'ini',
  'ini': 'ini',
  
  // Shell
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  
  // Misc
  'gitignore': 'gitignore',
  'dockerfile': 'dockerfile',
  'editorconfig': 'editorconfig',
  'gitattributes': 'gitattributes',
};

// Get language from file name or path
export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return fileExtensions[extension] || 'plaintext';
}

// Register themes and configurations
export function configureMonaco(monaco: typeof import('monaco-editor')) {
  // Register themes
  Object.entries(editorThemes).forEach(([themeName, themeData]) => {
    monaco.editor.defineTheme(themeName, themeData);
  });

  // Configure language specific settings
  Object.entries(languageConfigurations).forEach(([language, config]) => {
    monaco.languages.setLanguageConfiguration(language, config);
  });
}

// Default editor configuration
export const defaultEditorConfig = {
  theme: 'kodex-dark',
  ...defaultEditorOptions,
};

// Export types
export type EditorTheme = keyof typeof editorThemes;
