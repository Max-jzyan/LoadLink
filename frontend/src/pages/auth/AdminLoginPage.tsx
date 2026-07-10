/**
 * Admin Portal login page — accessible at /admin
 *
 * No role selector or sign-up link. Credentials are seed-only:
 *   admin@example.com / 12345678
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginAndFetchUser, setUser } from '@/services/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/Logo'
import { ROLE_HOME } from '@/config/routes'
import type { AppDispatch } from '@/services/store'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const authUser = await loginAndFetchUser(email, password)

      if (!authUser.role || !authUser.mongoId) {
        throw new Error('Account not found. Check your credentials.')
      }

      if (authUser.role !== 'admin') {
        throw new Error('This account does not have admin privileges.')
      }

      dispatch(setUser(authUser))
      navigate(ROLE_HOME['admin'])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Account not found') || msg.includes('admin privileges')) {
        setError(msg)
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} />
          <h1 className="text-2xl font-bold">LoadLink Admin</h1>
          <p className="text-sm text-muted-foreground text-center">
            Sign in with your admin credentials to access the platform management tools.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/60">
          This portal is restricted to authorised platform administrators.
        </p>
      </div>
    </div>
  )
}
