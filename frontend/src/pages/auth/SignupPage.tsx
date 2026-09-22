import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { type UserRole } from '@/types/enums'
import { registerAndFetchUser, setUser } from '@/services/authSlice'
import { setTourPending } from '@/hooks/useTour'
import { useRegisterUserMutation } from '@/services/userApi/userSlice'
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
import FileUploadField from '@/components/shared/FileUploadField'
import AvatarUploadField from '@/components/shared/AvatarUploadField'
import { ROLE_HOME } from '@/config/routes'
import type { AppDispatch } from '@/services/store'
import { uploadDocuments } from '@/lib/uploadDocuments'

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const [role, setRole] = useState<UserRole>('driver')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerUser, { isSuccess, error, isLoading }] = useRegisterUserMutation()
  const fbUserRef = useRef<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [certificationFiles, setCertificationFiles] = useState<File[]>([])
  const [businessDocFiles, setBusinessDocFiles] = useState<File[]>([])
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
      const documentFiles = role === 'driver' ? certificationFiles : businessDocFiles
      const authUser = await registerAndFetchUser(
        email,
        password,
        name.trim(),
        role,
        documentFiles,
        role === 'driver' ? profilePictureFile : null
      )
      dispatch(setUser(authUser))
      setTourPending()
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

  const handleGoogleSuccess = useCallback(
    async (fbUser: User) => {
      fbUserRef.current = fbUser

      const documentFiles = role === 'driver' ? certificationFiles : businessDocFiles
      let uploadedDocuments: Awaited<ReturnType<typeof uploadDocuments>> = []
      let profilePictureUrl: string | undefined
      const docType = role === 'driver' ? 'driverDocuments' : 'companyDocuments'
      if (documentFiles.length > 0 || (role === 'driver' && profilePictureFile)) {
        try {
          const idToken = await fbUser.getIdToken()

          if (documentFiles.length > 0) {
            uploadedDocuments = await uploadDocuments(idToken, fbUser.uid, docType, documentFiles)
          }

          if (role === 'driver' && profilePictureFile) {
            const [uploaded] = await uploadDocuments(idToken, fbUser.uid, docType, [
              profilePictureFile,
            ])
            profilePictureUrl = uploaded.url
          }
        } catch {
          throw new Error('Failed to upload one or more files. Please try again.')
        }
      }

      registerUser({
        name: fbUser.displayName ?? fbUser.email ?? 'Unknown',
        email: fbUser.email,
        role,
        ...(role === 'driver'
          ? {
              certificationDocuments: uploadedDocuments,
              ...(profilePictureUrl ? { profilePictureUrl } : {}),
            }
          : { businessDocuments: uploadedDocuments }),
      })
    },
    [role, certificationFiles, businessDocFiles, profilePictureFile, registerUser]
  )

  useEffect(() => {
    if (isSuccess && error) {
      const dbUser = (error as unknown as { data?: { _id?: string; role?: UserRole } })?.data
      if (dbUser && dbUser._id && dbUser.role && fbUserRef.current) {
        dispatch(
          setUser({
            uid: fbUserRef.current.uid,
            email: fbUserRef.current.email,
            mongoId: dbUser._id,
            role: dbUser.role,
          })
        )
        setTourPending()
        navigate(ROLE_HOME[dbUser.role])
        fbUserRef.current = null
      }
    }
  }, [isSuccess, error, dispatch, navigate])

  useEffect(() => {
    if (isLoading) {
      return
    }
    const mutationError = error as {
      status?: number
      data?: { code?: string; message?: string }
    } | null
    if (mutationError?.data?.code) {
      const code = mutationError.data.code
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        fbUserRef.current = null
        return
      }
      const msg = mutationError.data?.message || 'Google sign-up failed. Please try again.'
      setGlobalError(msg)
    }
  }, [isLoading, error])

  async function handleGoogle() {
    setLoading(true)
    setGlobalError(null)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      await handleGoogleSuccess(result.user)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        fbUserRef.current = null
        return
      }

      if (fbUserRef.current) {
        await signOut(auth)
        fbUserRef.current = null
      }

      const msg = err instanceof Error ? err.message : ''
      setGlobalError(msg || 'Google sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs py-4">
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

                {role === 'driver' && (
                  <div className="flex flex-col items-center gap-2">
                    <AvatarUploadField
                      file={profilePictureFile}
                      onFileChange={setProfilePictureFile}
                      fallbackText={getInitials(name) || '?'}
                      onError={setUploadError}
                      disabled={loading}
                    />
                    <FieldDescription className="text-center">
                      Optional: Add a profile picture
                    </FieldDescription>
                  </div>
                )}

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

                {/* Role-specific document upload */}
                {role === 'driver' ? (
                  <Field>
                    <FieldLabel>Certifications</FieldLabel>
                    <FileUploadField
                      files={certificationFiles}
                      onChange={setCertificationFiles}
                      onError={setUploadError}
                      multiple
                      disabled={loading}
                      buttonLabel="Upload certification"
                    />
                    <FieldDescription>Upload proof of any certifications.</FieldDescription>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>Business registration document</FieldLabel>
                    <FileUploadField
                      files={businessDocFiles}
                      onChange={setBusinessDocFiles}
                      onError={setUploadError}
                      disabled={loading}
                      buttonLabel="Upload document"
                    />
                    <FieldDescription>
                      Upload your business registration or incorporation document.
                    </FieldDescription>
                  </Field>
                )}

                {uploadError && (
                  <p className="text-center text-sm text-destructive">{uploadError}</p>
                )}

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
            Streamline the logistics of cargo transport
          </p>
          <footer className="text-sm text-slate-500">LoadLink</footer>
        </blockquote>
      </div>
    </div>
  )
}
