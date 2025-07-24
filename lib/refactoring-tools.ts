import { editor, languages } from 'monaco-editor';
import * as ts from 'typescript';
import { getLanguageFromPath } from './editor-config';

export interface RefactoringResult {
  success: boolean;
  changes: editor.IIdentifiedSingleEditOperation[];
  errors?: string[];
  warnings?: string[];
}

export interface RefactoringOptions {
  /**
   * Whether to update imports when moving/renaming symbols
   * @default true
   */
  updateImports?: boolean;
  
  /**
   * Whether to update references to the refactored symbol
   * @default true
   */
  updateReferences?: boolean;
  
  /**
   * Whether to create backups before applying changes
   * @default true
   */
  createBackups?: boolean;
  
  /**
   * Custom refactoring rules
   */
  rules?: RefactoringRule[];
}

export interface RefactoringContext {
  model: editor.ITextModel;
  position: editor.IPosition;
  language: string;
  code: string;
  ast?: ts.SourceFile;
  typeChecker?: ts.TypeChecker;
  program?: ts.Program;
}

export interface RefactoringRule {
  /** Unique identifier for the rule */
  id: string;
  
  /** Human-readable name of the rule */
  name: string;
  
  /** Description of what the rule does */
  description: string;
  
  /** Whether this rule is enabled */
  enabled: boolean;
  
  /**
   * Check if this rule applies to the current context
   */
  isApplicable: (context: RefactoringContext) => boolean | Promise<boolean>;
  
  /**
   * Apply the refactoring and return the changes
   */
  apply: (context: RefactoringContext) => Promise<RefactoringResult>;
}

/**
 * Refactoring tools for the Monaco Editor
 */
export class RefactoringTools {
  private editor: editor.IStandaloneCodeEditor;
  private monaco: typeof import('monaco-editor');
  private options: Required<RefactoringOptions>;
  private rules: Map<string, RefactoringRule>;
  
  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    monacoInstance: typeof import('monaco-editor'),
    options: RefactoringOptions = {}
  ) {
    this.editor = editorInstance;
    this.monaco = monacoInstance;
    this.options = {
      updateImports: true,
      updateReferences: true,
      createBackups: true,
      rules: [],
      ...options,
    };
    
    this.rules = new Map(
      [
        ...this.getDefaultRules(),
        ...(this.options.rules || []),
      ].map(rule => [rule.id, rule])
    );
  }
  
  /**
   * Get default refactoring rules
   */
  private getDefaultRules(): RefactoringRule[] {
    return [
      {
        id: 'extract-variable',
        name: 'Extract to Variable',
        description: 'Extracts the selected expression into a variable',
        enabled: true,
        isApplicable: this.canExtractVariable.bind(this),
        apply: this.extractVariable.bind(this),
      },
      {
        id: 'extract-method',
        name: 'Extract to Method',
        description: 'Extracts the selected code into a new method',
        enabled: true,
        isApplicable: this.canExtractMethod.bind(this),
        apply: this.extractMethod.bind(this),
      },
      {
        id: 'rename-symbol',
        name: 'Rename Symbol',
        description: 'Renames the selected symbol and all its references',
        enabled: true,
        isApplicable: this.canRenameSymbol.bind(this),
        apply: this.renameSymbol.bind(this),
      },
      {
        id: 'convert-to-arrow-function',
        name: 'Convert to Arrow Function',
        description: 'Converts a function expression to an arrow function',
        enabled: true,
        isApplicable: this.canConvertToArrowFunction.bind(this),
        apply: this.convertToArrowFunction.bind(this),
      },
    ];
  }
  
  /**
   * Get all available refactoring rules
   */
  public getRules(): RefactoringRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Get a specific refactoring rule by ID
   */
  public getRule(ruleId: string): RefactoringRule | undefined {
    return this.rules.get(ruleId);
  }
  
  /**
   * Add or update a refactoring rule
   */
  public setRule(rule: RefactoringRule): void {
    this.rules.set(rule.id, rule);
  }
  
  /**
   * Remove a refactoring rule
   */
  public removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
  
  /**
   * Get applicable refactoring actions for the current selection/cursor position
   */
  public async getApplicableRefactorings(): Promise<RefactoringRule[]> {
    const model = this.editor.getModel();
    if (!model) return [];
    
    const position = this.editor.getPosition();
    if (!position) return [];
    
    const language = getLanguageFromPath(model.uri.path);
    if (!['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
      return [];
    }
    
    const context = await this.createRefactoringContext(model, position);
    
    const applicableRules: RefactoringRule[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      try {
        const isApplicable = await rule.isApplicable(context);
        if (isApplicable) {
          applicableRules.push(rule);
        }
      } catch (error) {
        console.error(`Error checking if rule ${rule.id} is applicable:`, error);
      }
    }
    
    return applicableRules;
  }
  
  /**
   * Apply a refactoring rule
   */
  public async applyRefactoring(ruleId: string): Promise<RefactoringResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return {
        success: false,
        changes: [],
        errors: [`Refactoring rule not found: ${ruleId}`],
      };
    }
    
    const model = this.editor.getModel();
    if (!model) {
      return {
        success: false,
        changes: [],
        errors: ['No active editor model'],
      };
    }
    
    const position = this.editor.getPosition();
    if (!position) {
      return {
        success: false,
        changes: [],
        errors: ['No cursor position'],
      };
    }
    
    const context = await this.createRefactoringContext(model, position);
    
    try {
      const isApplicable = await rule.isApplicable(context);
      if (!isApplicable) {
        return {
          success: false,
          changes: [],
          errors: [`Refactoring rule is not applicable: ${rule.name}`],
        };
      }
      
      const result = await rule.apply(context);
      
      // Apply changes to the editor
      if (result.success && result.changes.length > 0) {
        this.editor.executeEdits('refactoring', result.changes);
      }
      
      return result;
    } catch (error) {
      console.error(`Error applying refactoring ${ruleId}:`, error);
      return {
        success: false,
        changes: [],
        errors: [`Error applying refactoring: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }
  
  /**
   * Create a refactoring context for the current editor state
   */
  private async createRefactoringContext(
    model: editor.ITextModel,
    position: editor.IPosition
  ): Promise<RefactoringContext> {
    const language = getLanguageFromPath(model.uri.path);
    const code = model.getValue();
    
    const context: RefactoringContext = {
      model,
      position,
      language,
      code,
    };
    
    // For TypeScript/JavaScript files, create an AST
    if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
      await this.enhanceWithTypeScriptContext(context);
    }
    
    return context;
  }
  
  /**
   * Enhance the context with TypeScript-specific information
   */
  private async enhanceWithTypeScriptContext(context: RefactoringContext): Promise<void> {
    try {
      // Dynamically import TypeScript if not already available
      const ts = await import('typescript');
      
      // Create a TypeScript source file
      const sourceFile = ts.createSourceFile(
        'file.ts',
        context.code,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Create a TypeScript program and type checker
      const program = ts.createProgram({
        rootNames: ['file.ts'],
        options: {
          target: ts.ScriptTarget.Latest,
          module: ts.ModuleKind.ESNext,
          strict: true,
          jsx: ts.JsxEmit.React,
        },
      });
      
      const typeChecker = program.getTypeChecker();
      
      // Add to context
      context.ast = sourceFile;
      context.program = program;
      context.typeChecker = typeChecker;
    } catch (error) {
      console.error('Error enhancing with TypeScript context:', error);
    }
  }
  
  // ===== Default Refactoring Rules =====
  
  private canExtractVariable(context: RefactoringContext): boolean {
    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) return false;
    
    // Check if the selection is a valid expression
    const selectedText = context.model.getValueInRange(selection);
    return selectedText.trim().length > 0;
  }
  
  private async extractVariable(context: RefactoringContext): Promise<RefactoringResult> {
    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) {
      return {
        success: false,
        changes: [],
        errors: ['No text selected'],
      };
    }
    
    const selectedText = context.model.getValueInRange(selection);
    const variableName = this.generateVariableName(selectedText);
    
    // Create the variable declaration
    const line = context.position.lineNumber;
    const indent = this.getLineIndentation(line);
    const newLine = this.monaco.editor.EndOfLineSequence.LF;
    const eol = newLine === this.monaco.editor.EndOfLineSequence.CRLF ? '\r\n' : '\n';
    
    const changes: editor.IIdentifiedSingleEditOperation[] = [
      // Insert the variable declaration before the current line
      {
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1,
        },
        text: `${indent}const ${variableName} = ${selectedText};${eol}${indent}`,
      },
      // Replace the selected text with the variable name
      {
        range: selection,
        text: variableName,
      },
    ];
    
    return {
      success: true,
      changes,
    };
  }
  
  private canExtractMethod(context: RefactoringContext): boolean {
    const selection = this.editor.getSelection();
    return !!(selection && !selection.isEmpty());
  }
  
  private async extractMethod(context: RefactoringContext): Promise<RefactoringResult> {
    // Implementation would be similar to extractVariable but more complex
    // This is a simplified version
    return {
      success: false,
      changes: [],
      errors: ['Not implemented'],
    };
  }
  
  private canRenameSymbol(context: RefactoringContext): boolean {
    // Check if the cursor is on an identifier
    const word = context.model.getWordAtPosition(context.position);
    return !!word;
  }
  
  private async renameSymbol(context: RefactoringContext): Promise<RefactoringResult> {
    const word = context.model.getWordAtPosition(context.position);
    if (!word) {
      return {
        success: false,
        changes: [],
        errors: ['No symbol at cursor position'],
      };
    }
    
    // In a real implementation, we would use the TypeScript language service
    // to find all references and rename them. For now, we'll just rename the current word.
    
    const newName = prompt('Enter new name:', word.word);
    if (!newName) {
      return {
        success: false,
        changes: [],
        warnings: ['Rename cancelled'],
      };
    }
    
    const changes: editor.IIdentifiedSingleEditOperation[] = [
      {
        range: {
          startLineNumber: context.position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: context.position.lineNumber,
          endColumn: word.endColumn,
        },
        text: newName,
      },
    ];
    
    return {
      success: true,
      changes,
      warnings: ['This is a basic rename that only renames the current occurrence. Full rename across files is not implemented.'],
    };
  }
  
  private canConvertToArrowFunction(context: RefactoringContext): boolean {
    // Check if the cursor is on a function keyword
    const line = context.model.getLineContent(context.position.lineNumber);
    return line.includes('function');
  }
  
  private async convertToArrowFunction(context: RefactoringContext): Promise<RefactoringResult> {
    const lineNumber = context.position.lineNumber;
    const line = context.model.getLineContent(lineNumber);
    
    // This is a simplified implementation
    // In a real implementation, we would parse the function and convert it properly
    if (line.includes('function')) {
      const arrowFunction = line
        .replace(/function\s*(\([^)]*\))/, '$1 =>')
        .replace(/\{\s*return\s+([^;]+);?\s*\}/, '$1')
        .trim();
      
      const changes: editor.IIdentifiedSingleEditOperation[] = [
        {
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
          },
          text: `const ${arrowFunction}`,
        },
      ];
      
      return {
        success: true,
        changes,
      };
    }
    
    return {
      success: false,
      changes: [],
      errors: ['Could not convert to arrow function'],
    };
  }
  
  // ===== Helper Methods =====
  
  private generateVariableName(text: string): string {
    // Simple variable name generator
    // In a real implementation, this would be more sophisticated
    const words = text
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special chars
      .split(/\s+/)
      .filter(Boolean);
    
    if (words.length === 0) return 'value';
    
    // Convert first word to camelCase
    let varName = words[0].toLowerCase();
    
    // Add first letter of other words
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.length > 0) {
        varName += word[0].toUpperCase() + word.slice(1).toLowerCase();
      }
    }
    
    // Ensure the name is a valid identifier
    if (!/^[a-zA-Z_]/.test(varName)) {
      varName = 'var' + varName;
    }
    
    return varName;
  }
  
  private getLineIndentation(lineNumber: number): string {
    const line = this.editor.getModel()?.getLineContent(lineNumber) || '';
    const match = line.match(/^\s*/);
    return match ? match[0] : '';
  }
}
