import * as ts from 'typescript';
import { ESLint } from 'eslint';

/**
 * Validates TypeScript code by attempting to compile it
 */
export async function validateTypeScript(code: string): Promise<boolean> {
  try {
    // First, try TypeScript compilation
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
      },
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      console.warn('TypeScript validation errors:', result.diagnostics);
      return false;
    }

    // Then, run ESLint for code quality
    const eslint = new ESLint({
      useEslintrc: false, // Don't use project's ESLint config
      baseConfig: {
        extends: [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended',
          'plugin:react/recommended',
          'plugin:react-hooks/recommended',
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
          },
        },
        plugins: ['@typescript-eslint', 'react', 'react-hooks'],
        rules: {
          // Basic rules
          'no-unused-vars': 'off', // Handled by TypeScript
          '@typescript-eslint/no-unused-vars': 'error',
          'no-console': 'warn',
          'no-debugger': 'warn',
          
          // React specific
          'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
          'react/prop-types': 'off', // Not needed with TypeScript
          
          // TypeScript specific
          '@typescript-eslint/explicit-module-boundary-types': 'off',
          '@typescript-eslint/no-explicit-any': 'warn',
        },
      },
    });

    const results = await eslint.lintText(code, { filePath: 'temp.tsx' });
    
    // Filter out warnings if you only care about errors
    const hasErrors = results.some(result => 
      result.messages.some(msg => msg.severity === 2)
    );

    if (hasErrors) {
      console.warn('ESLint validation errors:', results);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Extracts and formats validation errors from TypeScript code
 */
export function getTypeScriptErrors(code: string): string[] {
  const errors: string[] = [];
  
  const host = {
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
      return ts.createSourceFile(fileName, code, languageVersion, true);
    },
    writeFile: () => {},
    getDefaultLibFileName: () => 'lib.d.ts',
    getCurrentDirectory: () => '.',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => code,
    getCanonicalFileName: (fileName: string) => fileName,
    getNewLine: () => '\n',
    useCaseSensitiveFileNames: () => false,
  };

  const program = ts.createProgram(['temp.ts'], {
    noEmit: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    strict: true,
  }, host);

  const emitResult = program.emit();
  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start || 0
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );
      errors.push(
        `Line ${line + 1}, Column ${character + 1}: ${message}`
      );
    } else {
      errors.push(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    }
  });

  return errors;
}

/**
 * Formats code using Prettier
 */
export async function formatCode(
  code: string, 
  filePath: string = 'temp.tsx'
): Promise<string> {
  try {
    const prettier = await import('prettier');
    const config = await prettier.resolveConfig(filePath);
    
    return prettier.format(code, {
      ...config,
      parser: filePath.endsWith('.tsx') ? 'typescript' : 'babel',
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 80,
      tabWidth: 2,
    });
  } catch (error) {
    console.warn('Failed to format code with Prettier:', error);
    return code; // Return original code if formatting fails
  }
}
