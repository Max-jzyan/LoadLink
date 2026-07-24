import { useCallback, useEffect } from 'react'
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
import { ShieldX } from 'lucide-react'
import { auth } from '@/lib/firebase'
import {
  selectSessionState,
  selectBanReason,
  selectCurrentUser,
  setSessionState,
  setBanReason,
  setManualLogout,
} from '@/services/authSlice'
import { useEventSource } from '@/components/auction/useEventSource'
import { NOTIFICATION_TYPES } from '@/services/notificationApi/notificationEnum'

interface StreamedNotification {
  _id: string
  type: string
  title: string
  message: string
}

/**
 * Big, unmissable RED blocking popup shown the moment the current account is
 * detected as banned. This is a standalone modal — not the notification bell
 * — that takes over the screen and won't dismiss until the user clicks
 * through, so they can't miss why they were suspended.
 *
 * Uses the exact same `useEventSource` hook (with its retry/backoff logic)
 * that auction bids/prices and message threads already rely on — pointed at
 * the same `/api/notifications/stream` channel NotificationBell subscribes
 * to. An admin's ban action pushes an `account_banned` notification through
 * that channel instantly, so this reacts the moment it happens rather than
 * waiting for a poll or the next unrelated API call.
 *
 * Also triggered from two other places for full coverage:
 *  - login/token-restore (subscribeToAuthChanges)
 *  - the very next API call from an already-open tab (api.ts's baseQuery)
 *
 * Unlike SessionExpiredDialog, this does NOT auto-redirect — the user must
 * click "Return to Login" so they actually read the popup first.
 */
export default function AccountBannedDialog() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const sessionState = useSelector(selectSessionState)
  const banReason = useSelector(selectBanReason)
  const user = useSelector(selectCurrentUser)

  const { data: streamData } = useEventSource<StreamedNotification>(
    user ? '/api/notifications/stream' : null
  )

  useEffect(() => {
    if (streamData?.type === NOTIFICATION_TYPES.ACCOUNT_BANNED) {
      dispatch(setBanReason(streamData.message || streamData.title))
      dispatch(setSessionState('banned'))
    }
  }, [streamData, dispatch])

  const handleReturnToLogin = useCallback(async () => {
    setManualLogout()
    await signOut(auth)
    dispatch(setSessionState(null))
    dispatch(setBanReason(null))
    navigate('/login', { replace: true })
  }, [dispatch, navigate])

  if (sessionState !== 'banned') return null

  return (
    <Dialog open>
      {/*
        Uses explicit red-* utilities instead of the theme's `destructive`
        token: in light mode `--destructive` resolves to a near-black,
        zero-saturation color (a pre-existing token bug), not red, which made
        this render as a washed-out "clear" popup instead of an alarming one.
      */}
      <DialogContent
        className="sm:max-w-md border-4 border-red-600 bg-red-50 shadow-2xl shadow-red-900/40 dark:bg-red-950/90"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-600">
            <ShieldX className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-red-700 dark:text-red-400">
            Account Suspended
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2 text-center text-sm text-red-900 dark:text-red-200">
            <span className="block font-medium">
              {banReason || 'Your account has been suspended by an administrator.'}
            </span>
            <span className="block text-red-700/80 dark:text-red-300/80">
              If you believe this is a mistake, please contact support.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleReturnToLogin}
          >
            Return to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
