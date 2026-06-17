export type UserRole = 'driver' | 'company'

const ROLE_KEY = 'loadlink_role'

export function getStoredRole(): UserRole | null {
  const v = localStorage.getItem(ROLE_KEY)
  return v === 'driver' || v === 'company' ? v : null
}

export function setStoredRole(role: UserRole): void {
  localStorage.setItem(ROLE_KEY, role)
}

export function clearStoredRole(): void {
  localStorage.removeItem(ROLE_KEY)
}
