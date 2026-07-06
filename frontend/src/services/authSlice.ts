import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AppDispatch, RootState } from './store'
import { setStoredRole, type UserRole } from '@/hooks/useRole'
import { showSuccess, showError, getHttpErrorMessage, getErrorStatus } from '@/lib/toast'

export interface AuthUser {
  uid: string
  email: string | null
  // MongoDB _id of the document
  mongoId: string | null
  // single source of truth for role
  role: UserRole | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
}

const initialState: AuthState = {
  user: null,
  loading: true,
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
  },
})

export const { setUser, setAuthLoading } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectMongoId = (state: RootState) => state.auth.user?.mongoId ?? null
export const selectRole = (state: RootState) => state.auth.user?.role ?? null

// Fetch the MongoDB user profile for a given Firebase UID
// Returns null when the user hasn't been registered in the DB yet
async function fetchDbUser(firebaseUid: string): Promise<{ _id: string; role: UserRole } | null> {
  try {
    const res = await fetch(`/api/users/me?firebaseUid=${encodeURIComponent(firebaseUid)}`)
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
 *  3. We dispatch setUser with the complete profile and sync localStorage.
 *
 * Flow on logout: dispatch setUser(null).
 */
export function subscribeToAuthChanges(dispatch: AppDispatch) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      dispatch(setUser(null))
      return
    }

    // Keep loading while we fetch mongoId + role from the backend.
    dispatch(setAuthLoading())

    const dbUser = await fetchDbUser(firebaseUser.uid)

    dispatch(
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        mongoId: dbUser?._id ?? null,
        role: dbUser?.role ?? null,
      })
    )

    if (dbUser?.role) {
      setStoredRole(dbUser.role)
    }
  })
}

// Register a new user in both Firebase and MongoDB and return the full AuthUser so callers can dispatch setUser directly
export async function registerAndFetchUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<AuthUser> {
  try {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)

    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid: fbUser.uid, name, email, role }),
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

    const dbUser = await fetchDbUser(fbUser.uid)

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
