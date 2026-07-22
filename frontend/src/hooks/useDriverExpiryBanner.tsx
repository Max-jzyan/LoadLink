import { AlertBanner } from '@/components/shared/AlertBanner'
import { useGetDriverProfileQuery } from '@/services/driverApi/driverSlice'
import { differenceInDays, format } from 'date-fns'
import type { ReactNode } from 'react'

interface Options {
  driverId: string
  /** Called when the driver taps "Update" in any banner variant */
  onUpdateClick: () => void
}

/**
 * Returns a stacked expiry banner (error and/or warning) when the driver
 * has certification documents that have already expired or will expire within
 * 30 days.  Returns `undefined` when there is nothing to show.
 *
 * Uses the RTK Query cache — if the driver profile was already loaded by the
 * page no extra network request is made.
 *
 * @example
 * // In DriverRevenueCenter (home page):
 * const expiryBanner = useDriverExpiryBanner({
 *   driverId,
 *   onUpdateClick: () => navigate('/driver/'),
 * })
 * return <PageShell banner={expiryBanner}>…</PageShell>
 */
export function useDriverExpiryBanner({ driverId, onUpdateClick }: Options): ReactNode {
  const { data: driver } = useGetDriverProfileQuery(driverId)

  if (!driver) return undefined

  const now = new Date()
  const warnCutoff = new Date(now.getTime() + 30 * 24 * 3_600_000)

  const expiryDocs = (driver.certificationDocuments ?? [])
    .filter((d) => !!d.expiresAt)
    .map((d) => ({ name: d.name, expiresAt: new Date(d.expiresAt as string) }))

  const expiredDocs = expiryDocs.filter((d) => d.expiresAt < now)
  const expiringSoonDocs = expiryDocs.filter(
    (d) => d.expiresAt >= now && d.expiresAt <= warnCutoff
  )

  if (expiredDocs.length === 0 && expiringSoonDocs.length === 0) return undefined

  const updateBtn = (cls: string) => (
    <button
      type="button"
      onClick={onUpdateClick}
      className={`text-xs underline underline-offset-2 hover:no-underline whitespace-nowrap ${cls}`}
    >
      Update
    </button>
  )

  return (
    <div className="space-y-2">
      {expiredDocs.length > 0 && (
        <AlertBanner
          variant="error"
          title={
            expiredDocs.length === 1
              ? '1 document has expired'
              : `${expiredDocs.length} documents have expired`
          }
          message={`${expiredDocs.map((d) => d.name).join(', ')} — please upload renewed copies to stay eligible for loads.`}
          action={updateBtn('text-destructive')}
        />
      )}
      {expiringSoonDocs.length > 0 && (
        <AlertBanner
          variant="warning"
          title={
            expiringSoonDocs.length === 1
              ? '1 document expires soon'
              : `${expiringSoonDocs.length} documents expire soon`
          }
          message={expiringSoonDocs
            .map((d) => {
              const days = differenceInDays(d.expiresAt, now)
              return `${d.name} (${days} day${days !== 1 ? 's' : ''} — ${format(d.expiresAt, 'MMM d, yyyy')})`
            })
            .join(', ')}
          action={updateBtn('text-amber-700')}
        />
      )}
    </div>
  )
}
