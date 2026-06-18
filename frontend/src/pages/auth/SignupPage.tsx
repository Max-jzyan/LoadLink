import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { type UserRole } from '@/hooks/useRole'
import { registerAndFetchUser, setUser } from '@/services/authSlice'
import { useRegisterUserMutation } from '@/services/userApi/userSlice'
import { setStoredRole } from '@/hooks/useRole'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import Logo from '@/components/Logo'
import { RoutePath } from '@/config/routes'
import type { AppDispatch } from '@/services/store'

const ROLE_HOME: Record<UserRole, string> = {
  driver: RoutePath.DriverLoads,
  company: RoutePath.Loads,
}

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const [role, setRole] = useState<UserRole>('driver')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerUser] = useRegisterUserMutation()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'This field is required.'
    if (password.length < 8) errs.password = 'Must be at least 8 characters long.'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setGlobalError(null)
    setLoading(true)
    try {
      const authUser = await registerAndFetchUser(email, password, name.trim(), role)
      dispatch(setUser(authUser))
      setStoredRole(role)
      navigate(ROLE_HOME[role])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('email-already-in-use')) {
        setGlobalError('An account with this email already exists.')
      } else if (msg.includes('invalid-email')) {
        setGlobalError('Invalid email address.')
      } else if (msg.includes('Failed to register user profile')) {
        setGlobalError(msg)
      } else {
        setGlobalError('Sign-up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setGlobalError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user

      // Register in MongoDB
      const dbUser = await registerUser({
        firebaseUid: fbUser.uid,
        name: fbUser.displayName ?? fbUser.email ?? 'Unknown',
        email: fbUser.email,
        role,
      }).unwrap()
      dispatch(
        setUser({ uid: fbUser.uid, email: fbUser.email, mongoId: dbUser._id, role: dbUser.role })
      )
      setStoredRole(dbUser.role)
      navigate(ROLE_HOME[dbUser.role])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setGlobalError(msg || 'Google sign-up failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 h-full p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h2 className="text-2xl font-bold">Create your account</h2>
                </div>

                {/* Role toggle */}
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-1 bg-muted">
                  {(['driver', 'company'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        'cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        role === r
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {r === 'driver' ? 'Driver' : 'Company'}
                    </button>
                  ))}
                </div>

                <Field>
                  <FieldLabel htmlFor="name">
                    {role === 'driver' ? 'Full name' : 'Company name'}
                  </FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder={role === 'driver' ? 'Jane Smith' : 'Acme Freight Inc.'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                  {fieldErrors.name && (
                    <FieldDescription className="text-destructive">
                      {fieldErrors.name}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                  <FieldDescription className={cn(fieldErrors.password && 'text-destructive')}>
                    {fieldErrors.password ?? 'Must be at least 8 characters long.'}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Reenter your paswsord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-background"
                  />
                  {fieldErrors.confirmPassword && (
                    <FieldDescription className="text-destructive">
                      {fieldErrors.confirmPassword}
                    </FieldDescription>
                  )}
                </Field>

                {/* Global error */}
                {globalError && (
                  <p className="text-center text-sm text-destructive">{globalError}</p>
                )}

                <Field>
                  <Button type="submit" className="cursor-pointer w-full" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create account'}
                  </Button>
                </Field>

                <FieldSeparator>Or continue with</FieldSeparator>

                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer w-full"
                    onClick={handleGoogle}
                    disabled={loading}
                  >
                    Sign up with Google
                  </Button>
                  <FieldDescription className="text-center">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Sign in
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </div>
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
