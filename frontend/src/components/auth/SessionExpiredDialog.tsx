import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { signOut } from 'firebase/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebase'
import { getTokenExpiresAt } from '@/services/api'
import { selectSessionState, setSessionState, setManualLogout } from '@/services/authSlice'

const WARNING_BEFORE_MS = 10 * 60 * 1000 // 10 minutes
const POLL_INTERVAL_MS = 30_000 // check every 30 seconds

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

/**
 * Proactive session expiry dialog.
 *
 * Shows only while `sessionState === 'expiring'` (token expires within 10 min).
 * Counts down every second with a live "Renew session" button that forces
 * Firebase to refresh the ID token. Once the countdown hits zero, the dialog
 * auto-redirects to login and wipes the RTK Query cache.
 */
export default function SessionExpiredDialog() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const sessionState = useSelector(selectSessionState)

  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Detect "expiring" window ----
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (sessionState === 'expired') return // parent will redirect

      const expiresAt = getTokenExpiresAt()
      if (!expiresAt) return

      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        // Expired — set state so component redirects
        dispatch(setSessionState('expired'))
      } else if (remaining <= WARNING_BEFORE_MS && sessionState !== 'expiring') {
        dispatch(setSessionState('expiring'))
        setRemainingMs(remaining)
      } else if (remaining > WARNING_BEFORE_MS && sessionState === 'expiring') {
        // Renewed — back to normal
        dispatch(setSessionState(null))
        setRemainingMs(null)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [dispatch, sessionState])

  // ---- Countdown ticker (1s) while expiring ----
  useEffect(() => {
    if (sessionState !== 'expiring') return

    timerRef.current = setInterval(() => {
      const expiresAt = getTokenExpiresAt()
      if (!expiresAt) {
        dispatch(setSessionState(null))
        return
      }

      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        // Countdown done → sign out, wipe cache, redirect
        doRedirect()
      } else {
        setRemainingMs(remaining)
      }
    }, 1_000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [sessionState, dispatch, navigate])

  // ---- Auto-redirect when state flips to 'expired' outside our control ----
  useEffect(() => {
    if (sessionState === 'expired') {
      doRedirect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState])

  async function doRedirect() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setManualLogout()
    await signOut(auth)
    dispatch(setSessionState(null))
    navigate('/login', { replace: true })
  }

  // ---- Renew session ----
  const handleRenew = useCallback(async () => {
    try {
      const user = auth.currentUser
      if (user) {
        await user.getIdToken(true) // force refresh
      }
      dispatch(setSessionState(null))
      setRemainingMs(null)
    } catch {
      await doRedirect()
    }
  }, [dispatch, navigate])

  // ---- Immediate sign-out ----
  const handleSignOutNow = useCallback(async () => {
    await doRedirect()
  }, [navigate])

  // Show nothing when no session state is active
  if (!sessionState || sessionState === 'expired') return null

  // ---- Single unified dialog for the "expiring" phase ----
  const display = remainingMs !== null ? formatCountdown(remainingMs) : '—'

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Your session will expire soon</DialogTitle>
          <DialogDescription>
            Time remaining:{' '}
            <span className="font-mono font-semibold text-foreground">{display}</span>
            <br />
            Renew your session to continue working without interruption.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleSignOutNow}>
            Sign out
          </Button>
          <Button onClick={handleRenew}>Renew session</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}