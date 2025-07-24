// Application constants

export const APP_CONFIG = {
  name: 'Kodex',
  description: 'Next-generation full-stack web development platform',
  version: '1.0.0',
  author: 'Kodex Team',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

export const API_ROUTES = {
  auth: {
    login: '/api/auth/signin',
    logout: '/api/auth/signout',
    register: '/api/auth/register',
    profile: '/api/auth/profile',
  },
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (id: string) => `/api/projects/${id}`,
    update: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
  },
  ai: {
    generate: '/api/ai/generate',
    analyze: '/api/ai/analyze',
    explain: '/api/ai/explain',
  },
  deployment: {
    deploy: '/api/deploy',
    status: (id: string) => `/api/deploy/${id}`,
    logs: (id: string) => `/api/deploy/${id}/logs`,
  },
} as const

export const EDITOR_CONFIG = {
  defaultTheme: 'vs-dark',
  defaultLanguage: 'typescript',
  defaultFontSize: 14,
  defaultTabSize: 2,
  autoSaveDelay: 1000,
  maxFileSize: 1024 * 1024, // 1MB
} as const

export const COLLABORATION_CONFIG = {
  maxParticipants: 50,
  cursorUpdateInterval: 100,
  presenceUpdateInterval: 5000,
  operationBatchSize: 10,
  maxOperationHistory: 1000,
} as const

export const DEPLOYMENT_CONFIG = {
  maxBuildTime: 600000, // 10 minutes
  maxDeploymentSize: 100 * 1024 * 1024, // 100MB
  supportedProviders: ['vercel', 'netlify', 'aws'] as const,
  defaultEnvironment: 'production' as const,
} as const

export const VALIDATION_RULES = {
  email: {
    minLength: 5,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  projectName: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
  },
  fileName: {
    minLength: 1,
    maxLength: 255,
    pattern: /^[^<>:"/\\|?*\x00-\x1f]+$/,
  },
} as const

export const FILE_EXTENSIONS = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
  styles: ['.css', '.scss', '.sass', '.less'],
  markup: ['.html', '.htm', '.xml'],
  data: ['.json', '.yaml', '.yml', '.toml'],
  markdown: ['.md', '.mdx'],
  config: ['.config.js', '.config.ts', '.env'],
} as const

export const SUPPORTED_FRAMEWORKS = [
  'react',
  'next',
  'vue',
  'nuxt',
  'svelte',
  'angular',
  'vanilla',
] as const

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'html',
  'css',
  'scss',
  'json',
  'markdown',
  'yaml',
  'xml',
] as const

export const ERROR_MESSAGES = {
  auth: {
    invalidCredentials: 'Invalid email or password',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    emailInvalid: 'Please enter a valid email address',
    passwordTooShort: 'Password must be at least 8 characters long',
    passwordTooWeak: 'Password must contain uppercase, lowercase, numbers, and special characters',
  },
  project: {
    nameRequired: 'Project name is required',
    nameInvalid: 'Project name contains invalid characters',
    notFound: 'Project not found',
    accessDenied: 'Access denied to this project',
  },
  file: {
    nameRequired: 'File name is required',
    nameInvalid: 'File name contains invalid characters',
    tooLarge: 'File size exceeds maximum limit',
    notFound: 'File not found',
  },
  general: {
    networkError: 'Network error occurred. Please try again.',
    serverError: 'Server error occurred. Please try again later.',
    validationError: 'Please check your input and try again.',
    rateLimitExceeded: 'Too many requests. Please wait and try again.',
  },
} as const

export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: 'Successfully logged in',
    logoutSuccess: 'Successfully logged out',
    registerSuccess: 'Account created successfully',
    profileUpdated: 'Profile updated successfully',
  },
  project: {
    created: 'Project created successfully',
    updated: 'Project updated successfully',
    deleted: 'Project deleted successfully',
    deployed: 'Project deployed successfully',
  },
  file: {
    saved: 'File saved successfully',
    created: 'File created successfully',
    deleted: 'File deleted successfully',
  },
} as const