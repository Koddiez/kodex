import { analyzeDependencies, DependencyGraph } from '../dependency/graph';
import { parseCodeToAST } from '../ast/parser';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileRelevance {
  filePath: string;
  score: number;
  reasons: string[];
}

export class ContextSelector {
  private dependencyGraph: DependencyGraph = {};
  private fileEditTimestamps: Map<string, number> = new Map();
  private fileASTs: Map<string, any> = new Map();
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.normalize(projectRoot);
  }

  async initialize() {
    this.dependencyGraph = await analyzeDependencies(this.projectRoot);
    await this.scanProjectFiles();
  }

  private async scanProjectFiles() {
    const files = await this.getAllSourceFiles(this.projectRoot);
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        this.fileEditTimestamps.set(file, stats.mtimeMs);
        
        const content = await fs.readFile(file, 'utf-8');
        this.fileASTs.set(file, parseCodeToAST(content, file));
      } catch (error) {
        console.warn(`Failed to process ${file}:`, error);
      }
    }
  }

  private async getAllSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and other common directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.getAllSourceFiles(fullPath);
        files.push(...subFiles);
      } else if (this.isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private isSourceFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  async getRelevantFiles(
    activeFile: string,
    limit: number = 3
  ): Promise<FileRelevance[]> {
    const normalizedActiveFile = path.normalize(activeFile);
    const scores = new Map<string, { score: number; reasons: string[] }>();

    // 1. Check direct imports (highest priority)
    const imports = this.dependencyGraph[normalizedActiveFile]?.imports || [];
    for (const imp of imports) {
      const resolvedPath = this.resolveImportPath(imp, normalizedActiveFile);
      if (resolvedPath) {
        const existing = scores.get(resolvedPath) || { score: 0, reasons: [] };
        scores.set(resolvedPath, {
          score: existing.score + 10,
          reasons: [...existing.reasons, `Imported by ${path.basename(normalizedActiveFile)}`]
        });
      }
    }

    // 2. Check dependents (medium priority)
    const dependents = this.dependencyGraph[normalizedActiveFile]?.dependents || [];
    for (const dep of dependents) {
      const existing = scores.get(dep) || { score: 0, reasons: [] };
      scores.set(dep, {
        score: existing.score + 8,
        reasons: [...existing.reasons, `Depends on ${path.basename(normalizedActiveFile)}`]
      });
    }

    // 3. Check recently edited files (lower priority)
    const recentFiles = Array.from(this.fileEditTimestamps.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file]) => file);

    for (const file of recentFiles) {
      if (file !== normalizedActiveFile) {
        const existing = scores.get(file) || { score: 0, reasons: [] };
        scores.set(file, {
          score: existing.score + 5,
          reasons: [...existing.reasons, 'Recently edited file']
        });
      }
    }

    // 4. Check files in the same directory (lowest priority)
    const activeDir = path.dirname(normalizedActiveFile);
    for (const [file] of this.fileASTs.entries()) {
      if (file !== normalizedActiveFile && path.dirname(file) === activeDir) {
        const existing = scores.get(file) || { score: 0, reasons: [] };
        scores.set(file, {
          score: existing.score + 3,
          reasons: [...existing.reasons, 'Same directory']
        });
      }
    }

    // Sort by score and return top N
    return Array.from(scores.entries())
      .map(([filePath, { score, reasons }]) => ({
        filePath,
        score,
        reasons,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    try {
      // Handle relative imports
      if (importPath.startsWith('.')) {
        const dir = path.dirname(fromFile);
        const fullPath = path.resolve(dir, importPath);
        
        // Check for exact match
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }

        // Check with extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        for (const ext of extensions) {
          const testPath = `${fullPath}${ext}`;
          if (fs.existsSync(testPath)) {
            return testPath;
          }
        }
      }
      
      // Handle absolute imports (from src)
      if (importPath.startsWith('@/') || importPath.startsWith('src/')) {
        const basePath = importPath.startsWith('@/')
          ? importPath.replace('@/', '')
          : importPath.replace('src/', '');
        
        const possiblePaths = [
          path.join(this.projectRoot, 'src', basePath),
          path.join(this.projectRoot, basePath)
        ];

        for (const testPath of possiblePaths) {
          // Check for exact file
          if (fs.existsSync(testPath)) {
            return testPath;
          }

          // Check with extensions
          const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
          for (const ext of extensions) {
            const fullPath = `${testPath}${ext}`;
            if (fs.existsSync(fullPath)) {
              return fullPath;
            }
          }
        }
      }

      // Handle node_modules
      try {
        const resolved = require.resolve(importPath, { paths: [this.projectRoot] });
        return resolved;
      } catch {
        // Ignore resolution errors
      }

      return null;
    } catch (error) {
      console.warn(`Failed to resolve import path: ${importPath}`, error);
      return null;
    }
  }

  getFileAST(filePath: string): any | undefined {
    return this.fileASTs.get(path.normalize(filePath));
  }
}
