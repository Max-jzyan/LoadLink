import { auth } from '@/lib/firebase'

/**
 * Appends the current Firebase ID token to an SSE URL as `?access_token=`.
 *
 * The browser's EventSource can't set an Authorization header, so SSE endpoints
 * receive the token via query param instead (verified by requireAuthSSE on the
 * backend). A fresh token is fetched on every call so reconnects/retries never
 * reuse an expired one. Returns the path unchanged if no user is signed in.
 *
 * TODO: migrate useEventSource to @microsoft/fetch-event-source so the token can go in a
 * header and this query-param workaround can be removed.
 */
export async function withSSEToken(path: string): Promise<string> {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}access_token=${encodeURIComponent(token)}`
  } catch {
    return path
  }
}
