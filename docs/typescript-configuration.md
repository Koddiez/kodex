# TypeScript Configuration Guide

This document outlines the TypeScript configuration setup for the Kodex project, explaining the purpose of each configuration file and the recommended practices.

## Configuration Files

### 1. `tsconfig.base.json`
The base configuration that contains all shared TypeScript settings. This file should be extended by other configurations.

**Key Features:**
- Strict type checking enabled
- Modern JavaScript features (ES2022)
- Module resolution for both ESM and CommonJS
- Source maps for debugging
- Path aliases for cleaner imports

### 2. `tsconfig.json`
The main configuration file for the Next.js application. Extends the base config and adds Next.js specific settings.

**Key Features:**
- JSX support for React
- Next.js plugin integration
- Optimized for client and server components
- Proper type checking for Next.js API routes

### 3. `tsconfig.node.json`
Configuration for Node.js specific code (scripts, utilities).

**Key Features:**
- Node.js types included
- CommonJS module system
- Output directory for compiled files

### 4. `tsconfig.paths.json`
Centralized path aliases configuration.

**Key Features:**
- Consistent import paths across the project
- Easy maintenance of path aliases
- Single source of truth for module resolution

## Recommended Development Workflow

1. **VS Code Integration**
   - Install the "TypeScript and JavaScript Language Features" extension
   - Use "Go to Definition" (F12) to navigate between files
   - Enable "TypeScript: Restart TS Server" when experiencing type checking issues

2. **Type Checking**
   - Run `tsc --noEmit` to check for type errors
   - Use `tsc --build --watch` for incremental compilation

3. **Path Aliases**
   Use the defined path aliases for cleaner imports:
   ```typescript
   // Instead of:
   import { Button } from '../../../components/Button';
   
   // Use:
   import { Button } from '@/components/Button';
   ```

## Best Practices

1. **Strict Mode**
   - Always keep strict mode enabled
   - Fix all type errors before committing
   - Use type assertions (`as`) sparingly

2. **Type Definitions**
   - Keep type definitions in `.d.ts` files or in the `types` directory
   - Use interfaces for public API definitions
   - Use types for complex type operations

3. **Imports**
   - Prefer named imports over default imports
   - Group imports by type (external, internal, styles)
   - Use path aliases for all internal imports

4. **Error Handling**
   - Use TypeScript's type guards for runtime type checking
   - Leverage discriminated unions for better type safety
   - Use the `never` type for exhaustive type checking

## Common Issues and Solutions

### Module Resolution Issues
If you encounter module resolution errors:
1. Check if the path alias is correctly defined in `tsconfig.paths.json`
2. Ensure the file extension is included in the import statement if not using a module bundler
3. Run `npm run build` to ensure all dependencies are properly installed

### Type Errors with External Libraries
For libraries without TypeScript definitions:
1. Install `@types/package-name` if available
2. Create a declaration file in `src/types/package-name.d.ts`
3. Use `// @ts-ignore` as a last resort

### Performance Optimization
For large projects, consider:
1. Enabling `incremental` compilation
2. Using project references for better build times
3. Configuring `skipLibCheck` for faster type checking

## Updating the Configuration

When updating TypeScript or making significant changes to the configuration:

1. Update the version in `package.json`
2. Test the build process
3. Update this documentation if necessary
4. Inform the team about any breaking changes
