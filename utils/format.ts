/**
 * Format file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human readable format
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  
  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
}

/**
 * Format date to localized string
 */
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(
    new Date(date)
  )
}

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Convert camelCase to Title Case
 */
export const camelToTitle = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase())
    .trim()
}

/**
 * Convert kebab-case to Title Case
 */
export const kebabToTitle = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Generate random color for user avatars
 */
export const generateAvatarColor = (seed: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
  ]
  
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]!
}

/**
 * Format code for display (add syntax highlighting classes)
 */
export const formatCodeSnippet = (code: string, language: string): string => {
  // This is a simple formatter - in a real app you'd use a proper syntax highlighter
  return `<pre class="language-${language}"><code>${code}</code></pre>`
}

/**
 * Format API endpoint path
 */
export const formatApiPath = (path: string, params: Record<string, string> = {}): string => {
  let formattedPath = path
  
  Object.entries(params).forEach(([key, value]) => {
    formattedPath = formattedPath.replace(`:${key}`, value)
  })
  
  return formattedPath
}