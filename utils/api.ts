import type { ApiResponse } from '@/types/common'

/**
 * Generic API response handler
 */
export const handleApiResponse = async <T>(
  response: Response
): Promise<ApiResponse<T>> => {
  const data = (await response.json()) as ApiResponse<T>
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed')
  }
  
  return data
}

/**
 * Create API request with proper headers
 */
export const createApiRequest = (
  url: string,
  options: RequestInit = {}
): Request => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }
  
  return new Request(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })
}

/**
 * API error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Retry API request with exponential backoff
 */
export const retryApiRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}