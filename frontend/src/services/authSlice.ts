import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AppDispatch, RootState } from './store'
import { api } from './api'
import { type UserRole } from '@/types/enums'
import { showSuccess, showError, getHttpErrorMessage, getErrorStatus } from '@/lib/toast'
import { uploadDocuments, type UploadedDocument } from '@/lib/uploadDocuments'

export interface AuthUser {
  uid: string
  email: string | null
  // MongoDB _id of the document
  mongoId: string | null
  // single source of truth for role
  role: UserRole | null
}

export type SessionState = null | 'expiring' | 'expired'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  sessionState: SessionState
}

const initialState: AuthState = {
  user: null,
  loading: true,
  sessionState: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.loading = false
    },
    // loading=true while fetch
    setAuthLoading(state) {
      state.loading = true
    },
    setSessionState(state, action: PayloadAction<SessionState>) {
      state.sessionState = action.payload
    },
  },
})

export const { setUser, setAuthLoading, setSessionState } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectMongoId = (state: RootState) => state.auth.user?.mongoId ?? null
/**
 * Non-nullable variant intended for call sites that are already behind
 * ProtectedRoute/RoleLayout (which gate on loading + user). Returns an empty
 * string at the type level when no user is present, but in practice this only
 * fires after auth has resolved.
 */
export const selectRequiredMongoId = (state: RootState): string => state.auth.user?.mongoId ?? ''
export const selectFirebaseUid = (state: RootState) => state.auth.user?.uid ?? null
export const selectRole = (state: RootState) => state.auth.user?.role ?? null
export const selectSessionState = (state: RootState) => state.auth.sessionState

// Flag to distinguish manual logout from token expiry.
// Set to true just before calling signOut(auth) from NavUser or other manual
// logout flows, so subscribeToAuthChanges knows not to show the expired dialog.
let _isManualLogout = false

/** Call this before signOut(auth) to indicate the logout was user-initiated. */
export function setManualLogout() {
  _isManualLogout = true
}

// Fetch the MongoDB user profile for the current Firebase user.
// The backend derives identity from the verified token.
// Returns null when the user hasn't been registered in the DB yet.
export async function fetchDbUser(): Promise<{ _id: string; role: UserRole } | null> {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return null
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// AI generated
/**
 * Subscribes to Firebase auth changes.
 *
 * Flow on page load / token restore:
 *  1. Firebase tells us who is logged in.
 *  2. We immediately keep loading=true and hit GET /api/users/me to retrieve
 *     the MongoDB _id and role.
 *  3. We dispatch setUser with the complete profile (Redux is the single
 *     source of truth for role — nothing role-related is persisted client-side).
 *
 * Flow on logout: dispatch setUser(null), reset RTK Query cache.
 *   - If manual logout (_isManualLogout=true): just clean up, no dialog.
 *   - If token expiry (firebaseUser is null without manual flag): set
 *     sessionState to 'expired' so the UI can show a warning dialog.
 *
 * Track the last seen uid so a same-tab or cross-tab account swap resets the cache too
 */
let _lastSeenUid: string | null = null

export function subscribeToAuthChanges(dispatch: AppDispatch) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    const prevUid = _lastSeenUid
    const uidChanged = firebaseUser?.uid !== _lastSeenUid
    _lastSeenUid = firebaseUser?.uid ?? null

    if (!firebaseUser) {
      // Reset all RTK Query cached data so stale data from the previous
      // session is never shown when the next user logs in.
      dispatch(api.util.resetApiState())

      if (_isManualLogout) {
        _isManualLogout = false
        dispatch(setUser(null))
        return
      }

      // Only show the "session expired" dialog when there WAS a previous
      // authenticated session that just ended (prevUid was set). If the user
      // was never logged in on this page load (prevUid === null), firing the
      // expired state would immediately redirect them away from /admin before
      // they ever see the login form.
      if (prevUid !== null) {
        dispatch(setSessionState('expired'))
      }
      dispatch(setUser(null))
      return
    }

    if (uidChanged) {
      dispatch(api.util.resetApiState())
    }

    // Clear any leftover session state when a user re-appears
    dispatch(setSessionState(null))

    // Keep loading while we fetch mongoId + role from the backend.
    dispatch(setAuthLoading())

    const dbUser = await fetchDbUser()

    dispatch(
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        mongoId: dbUser?._id ?? null,
        role: dbUser?.role ?? null,
      })
    )
  })
}

// Register a new user in both Firebase and MongoDB and return the full AuthUser so callers can dispatch setUser directly
export async function registerAndFetchUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  documentFiles: File[] = [],
  profilePictureFile: File | null = null
): Promise<AuthUser> {
  try {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
    const token = await fbUser.getIdToken()

    // Upload any selected certification/business documents (and profile
    // picture) directly to S3 before creating the Mongo profile, so the
    // resulting URLs can be saved in the same request. Both share the same
    // per-role folder (driverDocuments/companyDocuments) as other documents.
    let uploadedDocuments: UploadedDocument[] = []
    let profilePictureUrl: string | undefined
    const docType = role === 'driver' ? 'driverDocuments' : 'companyDocuments'
    if (documentFiles.length > 0 || (role === 'driver' && profilePictureFile)) {
      try {
        if (documentFiles.length > 0) {
          uploadedDocuments = await uploadDocuments(token, fbUser.uid, docType, documentFiles)
        }

        if (role === 'driver' && profilePictureFile) {
          const [uploaded] = await uploadDocuments(token, fbUser.uid, docType, [profilePictureFile])
          profilePictureUrl = uploaded.url
        }
      } catch (uploadError) {
        await signOut(auth)
        throw uploadError
      }
    }

    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name,
        email,
        role,
        ...(role === 'driver'
          ? {
              certificationDocuments: uploadedDocuments,
              ...(profilePictureUrl ? { profilePictureUrl } : {}),
            }
          : { businessDocuments: uploadedDocuments }),
      }),
    })

    if (!res.ok) {
      await signOut(auth)
      throw new Error(getHttpErrorMessage(res.status, 'Failed to register user profile'))
    }

    const dbUser: { _id: string; role: UserRole } = await res.json()
    showSuccess('Account created successfully!')

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      mongoId: dbUser._id,
      role: dbUser.role,
    }
  } catch (error) {
    showError(getHttpErrorMessage(getErrorStatus(error), 'Failed to register. Please try again.'))
    throw error
  }
}

// Sign in with email/password and resolve the MongoDB profile
export async function loginAndFetchUser(email: string, password: string): Promise<AuthUser> {
  try {
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password)

    const dbUser = await fetchDbUser()

    showSuccess('Welcome back!')

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      mongoId: dbUser?._id ?? null,
      role: dbUser?.role ?? null,
    }
  } catch (error) {
    showError('Invalid email or password. Please try again.')
    throw error
  }
}

export async function logoutUser() {
  await signOut(auth)
}
