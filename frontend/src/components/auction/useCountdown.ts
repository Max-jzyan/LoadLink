import { useEffect, useState } from 'react'

export interface Countdown {
  expired: boolean
  label: string
  msLeft: number
}

export function useCountdown(expiresAt?: string): Countdown {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!expiresAt) return { expired: true, label: '—', msLeft: 0 }

  const msLeft = Math.max(0, new Date(expiresAt).getTime() - now)
  const expired = msLeft <= 0

  const totalSecs = Math.floor(msLeft / 1_000)
  const hours = Math.floor(totalSecs / 3_600)
  const minutes = Math.floor((totalSecs % 3_600) / 60)
  const seconds = totalSecs % 60

  let label: string
  if (hours > 0) {
    label = `${hours}h ${minutes}m`
  } else if (minutes >= 5) {
    label = `${minutes}m`
  } else {
    // show seconds for urgency when < 5 minutes left
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    label = `${mm}:${ss}`
  }

  return { expired, label, msLeft }
}
