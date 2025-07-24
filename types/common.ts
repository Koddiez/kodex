// Common utility types used throughout the application

export type ID = string

export type Timestamp = Date | string

export interface BaseEntity {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: Timestamp
    requestId?: string
  }
}

export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingState {
  status: Status
  error?: string | null
}

export type Theme = 'light' | 'dark' | 'system'

export type Language = 
  | 'typescript' 
  | 'javascript' 
  | 'tsx' 
  | 'jsx' 
  | 'html' 
  | 'css' 
  | 'scss' 
  | 'json' 
  | 'markdown' 
  | 'yaml' 
  | 'xml'

export interface FileExtensionMap {
  '.ts': 'typescript'
  '.tsx': 'tsx'
  '.js': 'javascript'
  '.jsx': 'jsx'
  '.html': 'html'
  '.css': 'css'
  '.scss': 'scss'
  '.json': 'json'
  '.md': 'markdown'
  '.yml': 'yaml'
  '.yaml': 'yaml'
  '.xml': 'xml'
}

export type Framework = 
  | 'react' 
  | 'next' 
  | 'vue' 
  | 'nuxt' 
  | 'svelte' 
  | 'angular' 
  | 'vanilla'

export type BuildTool = 'vite' | 'webpack' | 'parcel' | 'rollup' | 'esbuild'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'