import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import './App.css'
import { auth } from '@/lib/firebase'
import { initTheme } from '@/hooks/useTheme'
import PublicRoute from './components/auth/PublicRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DriverSidebar } from '@/components/DriverSidebar'
import { CompanySidebar } from '@/components/CompanySidebar'
import PageLayout from '@/components/PageLayout'
import AppRoutes from '@/routes'
import { getStoredRole } from '@/hooks/useRole'
import Spinner from '@/components/shared/Spinner'

// Picks the correct sidebar based on the stored role
// If authed but no role stored (localStorage cleared, different device, private tab)
// then sign out and let the person go through the full login flow again

function RoleLayout() {
  const role = getStoredRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!role) {
      signOut(auth).then(() => navigate('/login', { replace: true }))
    }
  }, [role, navigate])

  // prevents flashbang
  if (!role) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <SidebarProvider className="h-svh">
      {role === 'driver' ? <DriverSidebar /> : <CompanySidebar />}
      <SidebarInset>
        <PageLayout>
          <AppRoutes />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}

function App() {
  // use sys pref on every mount
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <Router>
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
