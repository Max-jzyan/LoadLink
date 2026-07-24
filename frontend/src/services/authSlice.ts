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
import { setAiTriggered } from './aiSlice'
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

export type SessionState = null | 'expiring' | 'expired' | 'banned'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  sessionState: SessionState
  banReason: string | null
}

const initialState: AuthState = {
  user: null,
  loading: true,
  sessionState: null,
  banReason: null,
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
    /**
     * Same as setSessionState('expired'), but never downgrades an active
     * 'banned' dialog — a banned account's Firebase session ending (via the
     * ban-handling sign-out) shouldn't get overwritten with the generic
     * "session expired" dialog before the user has read why they were banned.
     */
    setSessionExpired(state) {
      if (state.sessionState !== 'banned') {
        state.sessionState = 'expired'
      }
    },
    setBanReason(state, action: PayloadAction<string | null>) {
      state.banReason = action.payload
    },
  },
})

export const { setUser, setAuthLoading, setSessionState, setSessionExpired, setBanReason } =
  authSlice.actions
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
export const selectBanReason = (state: RootState) => state.auth.banReason

// Flag to distinguish manual logout from token expiry.
// Set to true just before calling signOut(auth) from NavUser or other manual
// logout flows, so subscribeToAuthChanges knows not to show the expired dialog.
let _isManualLogout = false

/** Call this before signOut(auth) to indicate the logout was user-initiated. */
export function setManualLogout() {
  _isManualLogout = true
}

/**
 * Set while an explicit login attempt (loginAndFetchUser, or the Google
 * sign-in flow on the login page) is in flight.
 *
 * `signInWithEmailAndPassword`/`signInWithPopup` fire `onAuthStateChanged`
 * immediately on success, which would otherwise race subscribeToAuthChanges's
 * own fetchDbUser() call against the login flow's own check below. For a
 * banned account that meant BOTH independently detected the ban — the login
 * page would show its normal inline error, but subscribeToAuthChanges would
 * also flip sessionState to 'banned' and pop the full-screen dialog for a
 * user who never even got past the login form.
 *
 * A failed login for a banned account should behave exactly like a wrong
 * password: stay on the login page with the normal inline error. The
 * full-screen dialog is reserved for a session that was already active when
 * the ban happened. Login/signup pages dispatch setUser themselves on
 * success, so it's safe for subscribeToAuthChanges to skip its own detection
 * entirely while this flag is set.
 */
let _isLoggingIn = false

/** Call this around an explicit login attempt (see above). */
export function setLoggingIn(value: boolean) {
  _isLoggingIn = value
}

/**
 * Thrown by fetchDbUser when the backend reports the account as banned
 * (403 + code: 'ACCOUNT_BANNED'), so callers can distinguish "banned" from
 * "not registered yet" and surface the real reason to the user instead of a
 * generic "account not found" message.
 */
export class BannedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BannedError'
  }
}

// Fetch the MongoDB user profile for the current Firebase user.
// The backend derives identity from the verified token.
// Returns null when the user hasn't been registered in the DB yet.
// Throws BannedError when the account has been suspended by an admin.
export async function fetchDbUser(): Promise<{ _id: string; role: UserRole } | null> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined)
  if (!token) return null

  let res: Response
  try {
    res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return null
  }

  if (res.ok) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  if (res.status === 403) {
    const body = await res.json().catch(() => ({}) as { code?: string; message?: string })
    if (body.code === 'ACCOUNT_BANNED') {
      throw new BannedError(
        body.message ?? 'Your account has been suspended. Please contact support.'
      )
    }
  }

  return null
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
 *     If the account is banned, we also populate banReason + sessionState so
 *     AccountBannedDialog can explain why before the user is signed out.
 *     This step is skipped entirely while an explicit login attempt is in
 *     flight (see setLoggingIn) so a banned login shows the normal inline
 *     error instead of the full-screen dialog.
 *
 * Flow on logout: dispatch setUser(null), reset RTK Query cache.
 *   - If manual logout (_isManualLogout=true): just clean up, no dialog.
 *   - If token expiry (firebaseUser is null without manual flag): set
 *     sessionState to 'expired' so the UI can show a warning dialog (unless
 *     a 'banned' dialog is already active — see setSessionExpired).
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
      // Reset AI-toggle state (and its localStorage mirror, via store.subscribe) on logout.
      dispatch(setAiTriggered(false))

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
        dispatch(setSessionExpired())
      }
      dispatch(setUser(null))
      return
    }

    // An explicit login attempt (loginAndFetchUser / Google sign-in on the
    // login page) owns this sign-in end-to-end, including its own ban check
    // and inline error — skip our own detection so a banned login never pops
    // the full-screen dialog. See setLoggingIn for details.
    if (_isLoggingIn) {
      return
    }

    if (uidChanged) {
      dispatch(api.util.resetApiState())
    }

    // Clear any leftover session state when a user re-appears
    dispatch(setSessionState(null))
    dispatch(setBanReason(null))

    // Keep loading while we fetch mongoId + role from the backend.
    dispatch(setAuthLoading())

    const dbUser = await fetchDbUser().catch((err: unknown) => {
      if (err instanceof BannedError) {
        dispatch(setBanReason(err.message))
        dispatch(setSessionState('banned'))
      }
      return null
    })

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

    // Files must be uploaded to S3 (via presigned URL) before registration, since the
    // register endpoint expects UploadedDocument[]/URL strings, not raw File objects.
    let uploadedDocuments: UploadedDocument[] = []
    let profilePictureUrl: string | undefined
    const docType = role === 'driver' ? 'driverDocuments' : 'companyDocuments'

    try {
      if (documentFiles.length > 0) {
        uploadedDocuments = await uploadDocuments(token, fbUser.uid, docType, documentFiles)
      }
      if (role === 'driver' && profilePictureFile) {
        const [uploaded] = await uploadDocuments(token, fbUser.uid, docType, [profilePictureFile])
        profilePictureUrl = uploaded.url
      }
    } catch {
      await signOut(auth)
      throw new Error('Failed to upload one or more files. Please try again.')
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

// Sign in with email/password and resolve the MongoDB profile.
// If the account has been banned, signs the Firebase session back out and
// throws with the real suspension message — treated by the caller exactly
// like a wrong-password error (inline, on the login form).
export async function loginAndFetchUser(email: string, password: string): Promise<AuthUser> {
  setLoggingIn(true)
  try {
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password)

    const dbUser = await fetchDbUser().catch(async (err: unknown) => {
      if (err instanceof BannedError) {
        await signOut(auth)
        // Deliberately generic — the specific ban reason is only ever shown
        // inside the app (AccountBannedDialog), never on the public login
        // form, so it behaves just like a wrong-password error.
        throw new Error('Your account has been suspended. Please contact support.', {
          cause: err,
        })
      }
      throw err
    })

    showSuccess('Welcome back!')

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      mongoId: dbUser?._id ?? null,
      role: dbUser?.role ?? null,
    }
  } catch (error) {
    if (error instanceof BannedError || (error instanceof Error && error.message)) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.toLowerCase().includes('suspend')) {
        showError(msg)
        throw error
      }
    }
    showError('Invalid email or password. Please try again.')
    throw error
  } finally {
    setLoggingIn(false)
  }
}

export async function logoutUser() {
  await signOut(auth)
}
