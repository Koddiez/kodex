import { parse, ParserOptions } from '@typescript-eslint/parser';

export interface CodeStructure {
  functions: Array<{
    name: string;
    type: 'function' | 'method' | 'arrow';
    start: number;
    end: number;
  }>;
  classes: Array<{
    name: string;
    methods: string[];
    start: number;
    end: number;
  }>;
  imports: Array<{
    source: string;
    specifiers: string[];
    isTypeOnly: boolean;
  }>;
}

export function parseCodeToAST(code: string, filePath: string): CodeStructure {
  const options: ParserOptions = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  };

  const ast = parse(code, options);
  const result: CodeStructure = {
    functions: [],
    classes: [],
    imports: [],
  };

  // Parse imports
  const importDeclarations = ast.body.filter(
    (node: any) => node.type === 'ImportDeclaration'
  );

  for (const node of importDeclarations) {
    if (node.type === 'ImportDeclaration') {
      result.imports.push({
        source: node.source.value,
        specifiers: node.specifiers.map((s: any) => {
          if (s.type === 'ImportDefaultSpecifier') {
            return `default as ${s.local.name}`;
          }
          if (s.type === 'ImportNamespaceSpecifier') {
            return `* as ${s.local.name}`;
          }
          return s.local.name;
        }),
        isTypeOnly: node.importKind === 'type',
      });
    }
  }

  // Parse functions and classes
  const traverse = (node: any) => {
    // Handle function declarations
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression'
    ) {
      const name =
        node.id?.name ||
        (node.parent?.type === 'VariableDeclarator' && node.parent.id?.name) ||
        'anonymous';
      result.functions.push({
        name,
        type: node.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
        start: node.range?.[0] || 0,
        end: node.range?.[1] || 0,
      });
    }

    // Handle class declarations
    if (node.type === 'ClassDeclaration' && node.id) {
      const methods = node.body?.body
        ?.filter((m: any) => m.type === 'MethodDefinition' && m.key?.name)
        .map((m: any) => m.key.name) || [];

      result.classes.push({
        name: node.id.name,
        methods,
        start: node.range?.[0] || 0,
        end: node.range?.[1] || 0,
      });
    }

    // Traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else if (node.body.body) {
        traverse(node.body);
      }
    }
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    if (node.expression) {
      traverse(node.expression);
    }
  };

  ast.body.forEach(traverse);
  return result;
}
