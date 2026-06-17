import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { loginUser, registerUser } from '@/services/authSlice'
import { RoutePath } from '@/config/routes'
import { USER_ROLES } from '@/types/enums'

type Mode = 'login' | 'register'

export default function AuthForm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<USER_ROLES | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginUser(email, password)
        navigate(RoutePath.Loads)
      } else {
        if (!userRole) {
          setError('Please select a user role')
          return
        }
        await registerUser(email, password, userRole)
        navigate(userRole === USER_ROLES.COMPANY ? RoutePath.Dashboard : RoutePath.DriverLoads)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create an account'}</CardTitle>
        <CardDescription>
          {mode === 'login'
            ? 'Sign in to your account to continue'
            : 'Enter your details to get started'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <CardContent className="flex flex-col gap-4 pb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserRole(USER_ROLES.DRIVER)}
                className={`flex-1 ${userRole === USER_ROLES.DRIVER ? 'bg-primary text-white' : ''}`}
              >
                I am a driver
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserRole(USER_ROLES.COMPANY)}
                className={`flex-1 ${userRole === USER_ROLES.COMPANY ? 'bg-primary text-white' : ''}`}
              >
                I work for a freight company
              </Button>
            </div>
          </CardContent>
        )}

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted placeholder:text-muted-foreground/50 focus:placeholder:text-transparent"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="* * * * * * *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-muted placeholder:text-muted-foreground/50 focus:placeholder:text-transparent"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 mt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>

          <Separator />

          <p className="text-sm text-muted-foreground text-center">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
