import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useDispatch, useSelector } from 'react-redux'
import './App.css'
import { auth } from '@/lib/firebase'
import { initTheme } from '@/hooks/useTheme'
import { api } from '@/services/api'
import PublicRoute from './components/auth/PublicRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import SessionExpiredDialog from './components/auth/SessionExpiredDialog'
import AccountBannedDialog from './components/auth/AccountBannedDialog'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import PageLayout from '@/components/PageLayout'
import AppRoutes from '@/routes'
import { selectRole, selectAuthLoading, selectSessionState, setManualLogout } from '@/services/authSlice'
import Spinner from '@/components/shared/Spinner'
import { TourProvider } from '@/contexts/TourContext'

// Picks the correct sidebar based on the server-resolved role (Redux is the
// single source of truth). If we finish loading and still have no role
// (unregistered account, cleared session), sign out and send the user back
// through the login flow.
//
// Exception: a banned account also resolves to role=null (see
// subscribeToAuthChanges), but we deliberately skip the auto sign-out here
// so AccountBannedDialog gets a chance to show the suspension reason first —
// it owns the actual sign-out via its "Return to Login" button.

function RoleLayout() {
  const role = useSelector(selectRole)
  const loading = useSelector(selectAuthLoading)
  const sessionState = useSelector(selectSessionState)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!loading && !role && sessionState !== 'banned') {
      setManualLogout()
      dispatch(api.util.resetApiState())
      signOut(auth).then(() => navigate('/login', { replace: true }))
    }
  }, [loading, role, sessionState, navigate, dispatch])

  // prevents flashbang
  if (loading || !role) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
  <TourProvider>
    <SidebarProvider defaultOpen={false} className="h-svh">
      <AppSidebar role={role} />
      <SidebarInset>
        <PageLayout>
          <AppRoutes />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  </TourProvider>
)

}

function App() {
  // use sys pref on every mount
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <Router>
      <SessionExpiredDialog />
      <AccountBannedDialog />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        {/* Admin portal — separate login page, not in the public signup flow */}
        <Route
          path="/admin"
          element={
            <PublicRoute>
              <AdminLoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <RoleLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
