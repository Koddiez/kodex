import { VALIDATION_RULES, ERROR_MESSAGES } from './constants'

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  
  if (!email) {
    errors.push(ERROR_MESSAGES.auth.emailRequired)
  } else if (email.length < VALIDATION_RULES.email.minLength) {
    errors.push(`Email must be at least ${VALIDATION_RULES.email.minLength} characters`)
  } else if (email.length > VALIDATION_RULES.email.maxLength) {
    errors.push(`Email must be no more than ${VALIDATION_RULES.email.maxLength} characters`)
  } else if (!VALIDATION_RULES.email.pattern.test(email)) {
    errors.push(ERROR_MESSAGES.auth.emailInvalid)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []
  const rules = VALIDATION_RULES.password
  
  if (!password) {
    errors.push(ERROR_MESSAGES.auth.passwordRequired)
  } else {
    if (password.length < rules.minLength) {
      errors.push(ERROR_MESSAGES.auth.passwordTooShort)
    }
    
    if (password.length > rules.maxLength) {
      errors.push(`Password must be no more than ${rules.maxLength} characters`)
    }
    
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Project name validation
 */
export const validateProjectName = (name: string): ValidationResult => {
  const errors: string[] = []
  const rules = VALIDATION_RULES.projectName
  
  if (!name) {
    errors.push(ERROR_MESSAGES.project.nameRequired)
  } else if (name.length < rules.minLength) {
    errors.push(`Project name must be at least ${rules.minLength} character`)
  } else if (name.length > rules.maxLength) {
    errors.push(`Project name must be no more than ${rules.maxLength} characters`)
  } else if (!rules.pattern.test(name)) {
    errors.push(ERROR_MESSAGES.project.nameInvalid)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * File name validation
 */
export const validateFileName = (name: string): ValidationResult => {
  const errors: string[] = []
  const rules = VALIDATION_RULES.fileName
  
  if (!name) {
    errors.push(ERROR_MESSAGES.file.nameRequired)
  } else if (name.length < rules.minLength) {
    errors.push(`File name must be at least ${rules.minLength} character`)
  } else if (name.length > rules.maxLength) {
    errors.push(`File name must be no more than ${rules.maxLength} characters`)
  } else if (!rules.pattern.test(name)) {
    errors.push(ERROR_MESSAGES.file.nameInvalid)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Generic form validation
 */
export const validateForm = <T extends Record<string, unknown>>(
  data: T,
  validators: Record<keyof T, (value: T[keyof T]) => ValidationResult>
): ValidationResult => {
  const allErrors: string[] = []
  
  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(data[field as keyof T])
    if (!result.isValid) {
      allErrors.push(...result.errors)
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  }
}

/**
 * Sanitize input string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

/**
 * Check if string is safe for HTML output
 */
export const isSafeHtml = (input: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate URL
 */
export const validateUrl = (url: string): ValidationResult => {
  const errors: string[] = []
  
  try {
    new URL(url)
  } catch {
    errors.push('Invalid URL format')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}