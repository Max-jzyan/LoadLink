import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { setStoredRole, type UserRole } from '@/hooks/useRole'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/Logo'
import { RoutePath } from '@/config/routes'

const ROLE_HOME: Record<UserRole, string> = {
  driver: RoutePath.Dashboard,
  company: RoutePath.Dashboard,
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('driver')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function afterLogin(selectedRole: UserRole) {
    setStoredRole(selectedRole)
    navigate(ROLE_HOME[selectedRole])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // TODO: POST role to backend to persist on server
      afterLogin(role)
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      // TODO: POST role to backend to persist on srever
      afterLogin(role)
    } catch {
      setError('Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-svh lg:grid-cols-2">
      <div className="flex h-full items-center justify-center px-8">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Welcome back!</h1>
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
                placeholder="Enter yoru email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
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

      <div className="hidden lg:flex bg-slate-900 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2 justify-end">
          <Logo size={24} />
          <span className="font-semibold text-lg">LoadLink</span>
        </div>
        <blockquote className="space-y-2 text-right">
          <p className="text-lg leading-relaxed text-slate-300">
            PUT SOME DESCRIPTION WIHT BUZZWORDS HERE
          </p>
          <footer className="text-sm text-slate-500">CPSC 455 Team 5</footer>
        </blockquote>
      </div>
    </div>
  )
}
