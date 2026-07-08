import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let cachedAuth: Auth | null = null
let warnedMissingCreds = false

/**
 * Returns the memoized Firebase Admin `Auth` instance, initializing the app on
 * first use. Returns `null` only when the three FIREBASE_* credentials are
 * absent — in that case the auth middleware fails closed (protected routes
 * return 500) rather than letting unverified requests through.
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth
  if (getApps().length) {
    cachedAuth = getAuth()
    return cachedAuth
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    if (!warnedMissingCreds) {
      console.warn(
        '[auth] Firebase admin credentials missing — protected routes will return 500. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in the backend .env.'
      )
      warnedMissingCreds = true
    }
    return null
  }

  const app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  cachedAuth = getAuth(app)
  return cachedAuth
}
