import { toast } from 'sonner'

const DEFAULT_TIMEOUT = 4000
const ERROR_TIMEOUT = 6000

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  description?: string
  duration?: number
}

/**
 * Show a success toast
 */
export function showSuccess(message: string, options?: ToastOptions) {
  toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? DEFAULT_TIMEOUT,
  })
}

/**
 * Show an error toast
 */
export function showError(message: string, options?: ToastOptions) {
  toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? ERROR_TIMEOUT,
  })
}

/**
 * Show an info toast
 */
export function showInfo(message: string, options?: ToastOptions) {
  toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? DEFAULT_TIMEOUT,
  })
}

/**
 * Show a warning toast
 */
export function showWarning(message: string, options?: ToastOptions) {
  toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? DEFAULT_TIMEOUT,
  })
}

/**
 * Get a user-friendly error message based on HTTP status code
 */
export function getHttpErrorMessage(status: number, defaultMessage?: string): string {
  switch (true) {
    case status >= 200 && status < 300:
      return defaultMessage ?? 'Operation completed successfully'
    case status === 400:
      return 'Invalid request. Please check your input and try again.'
    case status === 401:
      return 'You are not authorized. Please log in again.'
    case status === 403:
      return "You don't have permission to perform this action."
    case status === 404:
      return 'The requested resource was not found.'
    case status === 409:
      return 'This action conflicts with existing data.'
    case status >= 400 && status < 500:
      return defaultMessage ?? 'Client error. Please try again.'
    case status === 500:
      return 'Server error. Please try again later.'
    case status === 502:
      return 'Service temporarily unavailable. Please try again.'
    case status >= 500:
      return defaultMessage ?? 'Server error. Please try again later.'
    default:
      return defaultMessage ?? 'An unexpected error occurred.'
  }
}

/**
 * Safely extract HTTP status code from an error object
 */
export function getErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (typeof status === 'number') {
      return status
    }
  }
  return 500
}

/**
 * Get a success message template based on the action and entity
 */
export function getSuccessMessage(action: string, entity: string): string {
  const actionLower = action.toLowerCase()
  const entityLower = entity.toLowerCase()

  switch (actionLower) {
    case 'create':
    case 'post':
      return `Successfully created ${entityLower}`
    case 'update':
    case 'patch':
      return `Successfully updated ${entityLower}`
    case 'delete':
    case 'remove':
      return `Successfully deleted ${entityLower}`
    case 'claim':
      return `Successfully claimed ${entityLower}`
    case 'bid':
      return `Successfully placed bid on ${entityLower}`
    default:
      return `${action} ${entityLower} completed successfully`
  }
}
