import { Toaster } from '@/components/ui/sonner'

/**
 * ToastManager - Global toast notification container
 *
 * This component wraps the Sonner Toaster and provides a centralized
 * location for all toast notifications in the application.
 *
 * Place this component in PageLayout to make toasts available globally.
 */
export function ToastManager() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          error: 'bg-red-500 text-white',
          success: 'bg-green-500 text-white',
          warning: 'bg-yellow-500 text-white',
          info: 'bg-blue-500 text-white',
        },
      }}
    />
  )
}
