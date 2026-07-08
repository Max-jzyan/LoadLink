# Toast Notification System

## Overview

The toast notification system provides global feedback for user actions across the application. It uses **Sonner** for rendering and **Redux Toolkit** for state management.

## Architecture

### Components

- **`frontend/src/components/ui/sonner.tsx`** - Base Sonner Toaster component with custom styling
- **`frontend/src/components/shared/ToastManager.tsx`** - Wrapper component that configures global toast settings
- **`frontend/src/lib/toast.ts`** - Utility functions for showing toasts with templates
- **`frontend/src/services/toastSlice.ts`** - Redux slice for managing toast state (optional, for component-triggered toasts)

### Integration

- **`frontend/src/components/PageLayout.tsx`** - Includes `<ToastManager />` for global availability

## Usage

### In API Layer (RTK Query)

```typescript
import { showSuccess, showError, getSuccessMessage, getHttpErrorMessage } from '@/lib/toast'

// In your endpoint definition:
createLoad: build.mutation<Load, { companyId: string; body: CreateLoadPayload }>({
  query: ({ companyId, body }) => ({
    url: `company/${companyId}/loads`,
    method: 'POST',
    body,
  }),
  invalidatesTags: [...],
  async onQueryStarted(arg, { queryFulfilled }) {
    try {
      await queryFulfilled
      showSuccess(getSuccessMessage('create', 'load'))
    } catch (error) {
      const status = error?.status ?? 500
      showError(getHttpErrorMessage(status))
    }
  },
})
```

### In Components

```typescript
import { showSuccess, showError, showInfo, showWarning } from '@/lib/toast'

// Simple usage:
showSuccess('Operation completed!')
showError('Something went wrong')
showInfo('Did you know?')
showWarning('Please be careful')

// With options:
showSuccess('Load created', {
  description: 'Load #ABC123 has been posted',
  duration: 6000,
})
```

### Using Redux (Optional)

```typescript
import { showToast, dismissToast } from '@/services/toastSlice'
import type { Toast } from '@/services/toastSlice'

// Dispatch a toast
dispatch(
  showToast({
    type: 'success',
    message: 'Custom toast',
    description: 'With description',
    duration: 5000,
  })
)

// Dismiss a specific toast
dispatch(dismissToast(toastId))
```

## Templates

### Success Messages

The `getSuccessMessage(action, entity)` function provides templates:

- `create` + `load` → "Successfully created load"
- `update` + `auction` → "Successfully updated auction"
- `delete` + `truck` → "Successfully deleted truck"
- `claim` + `load` → "Successfully claimed load"

### Error Messages

The `getHttpErrorMessage(status)` function provides user-friendly messages:

- `400` → "Invalid request. Please check your input and try again."
- `401` → "You are not authorized. Please log in again."
- `403` → "You don't have permission to perform this action."
- `404` → "The requested resource was not found."
- `409` → "This action conflicts with existing data."
- `500` → "Server error. Please try again later."
- `502` → "Service temporarily unavailable. Please try again."

## Expanding to Other Endpoints

To add toast notifications to other API endpoints:

1. Import the toast utilities:

```typescript
import { showSuccess, showError, getSuccessMessage, getHttpErrorMessage } from '@/lib/toast'
```

2. Add `onQueryStarted` handler to mutations:

```typescript
yourMutation: build.mutation<Response, Payload>({
  query: (payload) => ({ url: 'endpoint', method: 'POST', body: payload }),
  invalidatesTags: [...],
  async onQueryStarted(arg, { queryFulfilled }) {
    try {
      await queryFulfilled
      showSuccess(getSuccessMessage('create', 'entity'))
    } catch (error) {
      const status = error?.status ?? 500
      showError(getHttpErrorMessage(status))
    }
  },
})
```

## Configuration

### ToastManager Settings

Edit `frontend/src/components/shared/ToastManager.tsx` to customize:

- Position: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top-center`, `bottom-center`
- Duration: Default 4000ms
- Rich colors: Enabled for better visual distinction
- Close button: Enabled for manual dismissal

### Toast Utility Defaults

Edit `frontend/src/lib/toast.ts` to customize:

- Default durations for each toast type
- HTTP status code message templates
- Success message templates
