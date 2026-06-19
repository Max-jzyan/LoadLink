export const formatMoney = (amount: number, locale = 'en-CA') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(amount)

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function timeAgo(dateValue: string | Date | number): string {
  const now = Date.now()
  const then = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 5) return 'just now'
  if (seconds < MINUTE) return `${seconds}s ago`
  if (seconds < HOUR) {
    const minutes = Math.floor(seconds / MINUTE)
    return `${minutes}m ago`
  }
  if (seconds < DAY) {
    const hours = Math.floor(seconds / HOUR)
    return `${hours}h ago`
  }
  if (seconds < WEEK) {
    const days = Math.floor(seconds / DAY)
    return `${days}d ago`
  }
  if (seconds < MONTH) {
    const weeks = Math.floor(seconds / WEEK)
    return `${weeks}w ago`
  }
  if (seconds < YEAR) {
    const months = Math.floor(seconds / MONTH)
    return `${months}mo ago`
  }
  const years = Math.floor(seconds / YEAR)
  return `${years}y ago`
}
