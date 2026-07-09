import { useSelector } from 'react-redux'
import {
  selectCurrentUser,
  selectAuthLoading,
  selectRequiredMongoId,
} from '@/services/authSlice'

const useAuth = () => {
  const user = useSelector(selectCurrentUser)
  const loading = useSelector(selectAuthLoading)
  return { user, loading }
}

/**
 * Returns the authenticated user's MongoDB _id as a non-nullable string.
 *
 * Intended for use inside components that are already wrapped in ProtectedRoute
 * or RoleLayout, which guarantee auth has resolved before rendering children.
 * If called before auth is ready, returns an empty string — callers should skip
 * dependent operations when falsy (though in practice this cannot happen under
 * the ProtectedRoute gate).
 */
export const useRequiredMongoId = (): string => useSelector(selectRequiredMongoId)

export default useAuth
