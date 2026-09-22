import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { useDispatch } from 'react-redux'
import { auth, googleProvider } from '@/lib/firebase'
import { loginAndFetchUser, setUser, fetchDbUser, BannedError } from '@/services/authSlice'
import { type UserRole } from '@/types/enums'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/Logo'
import { ROLE_HOME } from '@/config/routes'
import type { AppDispatch } from '@/services/store'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const [role, setRole] = useState<UserRole>('driver')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function afterLogin(dbRole: UserRole) {
    navigate(ROLE_HOME[dbRole])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const authUser = await loginAndFetchUser(email, password)

      if (!authUser.role || !authUser.mongoId) {
        throw new Error('Account not found. Please sign up first.')
      }

      // Role msimatch with good creds
      if (authUser.role !== role) {
        throw new Error(
          `This account is registered as a ${authUser.role}. Please select "${authUser.role}" and try again.`
        )
      }

      dispatch(setUser(authUser))
      afterLogin(authUser.role)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (
        msg.includes('Account not found') ||
        msg.includes('registered as a') ||
        msg.toLowerCase().includes('suspend')
      ) {
        setError(msg)
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user

      let dbUser: { _id: string; role: UserRole } | null
      try {
        dbUser = await fetchDbUser()
      } catch (err) {
        if (err instanceof BannedError) {
          await auth.signOut()
          // Generic message only — the specific ban reason is reserved for
          // AccountBannedDialog inside the app, not the public login form.
          throw new Error('Your account has been suspended. Please contact support.', {
            cause: err,
          })
        }
        throw new Error('Account not found. Please sign up first.', { cause: err })
      }

      if (!dbUser) {
        throw new Error('Account not found. Please sign up first.')
      }

      // Role mismatch with google
      if (dbUser.role !== role) {
        throw new Error(
          `This account is registered as a ${dbUser.role}. Please select "${dbUser.role}" and try again.`
        )
      }

      dispatch(
        setUser({ uid: fbUser.uid, email: fbUser.email, mongoId: dbUser._id, role: dbUser.role })
      )
      afterLogin(dbUser.role)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-svh lg:grid-cols-2 lg:overflow-hidden">
      {/* Login card — slides left/right */}
      <div
        className={cn(
          'flex h-full items-center justify-center px-8 bg-background',
          'lg:absolute lg:inset-y-0 lg:left-0 lg:w-1/2',
          'lg:transition-transform lg:duration-700 lg:ease-in-out',
          role === 'company' ? 'lg:translate-x-full' : 'lg:translate-x-0'
        )}
      >
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">
              {role === 'driver' ? 'Driver sign in' : 'Company sign in'}
            </h1>
          </div>

          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-1 bg-muted">
            {(['driver', 'company'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors',
                  role === r
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {r === 'driver' ? 'Driver' : 'Company'}
              </button>
            ))}
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-center text-sm text-destructive">{error}</p>}

            <Button type="submit" className="cursor-pointer w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="cursor-pointer w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="cursor-pointer underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Branding panel — slides left/right */}
      <div
        className={cn(
          'hidden lg:flex flex-col justify-between p-12 text-white bg-slate-900',
          'lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2',
          'lg:transition-transform lg:duration-700 lg:ease-in-out',
          role === 'company' ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        <div className="flex h-full w-full flex-col justify-between">
          <div className="flex items-center gap-2">
            <div
              className="transition-all duration-700 ease-in-out"
              style={{ flexGrow: role === 'company' ? 0 : 1 }}
            />
            <Logo size={24} />
            <span className="font-semibold text-lg">LoadLink</span>
          </div>
          <div className="space-y-2">
            <div className="flex">
              <div
                className="transition-all duration-700 ease-in-out"
                style={{ flexGrow: role === 'company' ? 0 : 1 }}
              />
              <p className="text-lg leading-relaxed text-slate-300">
                Streamline the logistics of cargo transport
              </p>
            </div>
            <div className="flex">
              <div
                className="transition-all duration-700 ease-in-out"
                style={{ flexGrow: role === 'company' ? 0 : 1 }}
              />
              <footer className="text-sm text-slate-500">LoadLink</footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}