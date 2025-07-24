import { create as createMadge } from 'madge';
import * as path from 'path';

export interface DependencyGraph {
  [file: string]: {
    imports: string[];
    exports: string[];
    dependents: string[];
  };
}

export async function analyzeDependencies(
  projectPath: string
): Promise<DependencyGraph> {
  try {
    const result = await createMadge(projectPath, {
      fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      tsConfig: {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
          },
        },
      },
    });

    // Convert madge's dependency graph to our format
    const graph: DependencyGraph = {};
    const madgeObj = result.obj();
    
    // First pass: initialize all nodes
    Object.keys(madgeObj).forEach(file => {
      graph[file] = {
        imports: [],
        exports: [],
        dependents: []
      };
    });

    // Second pass: populate imports and dependents
    Object.entries(madgeObj).forEach(([file, deps]) => {
      if (Array.isArray(deps)) {
        graph[file].imports = [...deps];
        
        // Update dependents for each imported file
        deps.forEach(dep => {
          if (graph[dep]) {
            graph[dep].dependents.push(file);
          }
        });
      }
    });

    return graph;
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    return {};
  }
}

export function findCircularDependencies(graph: DependencyGraph): string[][] {
  const visited: Record<string, boolean> = {};
  const recStack: Record<string, boolean> = {};
  const result: string[][] = [];

  const isCyclicUtil = (node: string, path: string[]): boolean => {
    if (!visited[node]) {
      visited[node] = true;
      recStack[node] = true;
      path.push(node);

      for (const neighbor of graph[node]?.imports || []) {
        if (!visited[neighbor] && isCyclicUtil(neighbor, path)) {
          return true;
        } else if (recStack[neighbor]) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            result.push(path.slice(cycleStart));
          }
          return true;
        }
      }
    }

    recStack[node] = false;
    path.pop();
    return false;
  };

  // Check each node for cycles
  Object.keys(graph).forEach(node => {
    if (!visited[node]) {
      isCyclicUtil(node, []);
    }
  });

  return result;
}

export function getDependencyChain(
  graph: DependencyGraph,
  sourceFile: string,
  targetFile: string
): string[] | null {
  const visited = new Set<string>();
  const queue: { file: string; path: string[] }[] = [
    { file: sourceFile, path: [sourceFile] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.file === targetFile) {
      return current.path;
    }

    if (!visited.has(current.file)) {
      visited.add(current.file);
      
      const dependencies = graph[current.file]?.imports || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          queue.push({
            file: dep,
            path: [...current.path, dep],
          });
        }
      }
    }
  }

  return null;
}
