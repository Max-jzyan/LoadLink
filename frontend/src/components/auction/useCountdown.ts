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
  const totalMinutes = Math.floor(msLeft / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return { expired, label, msLeft }
}
