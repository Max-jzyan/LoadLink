import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import PageLayout from '@/components/PageLayout'
import AppRoutes from '@/routes'
import { useLocation } from 'react-router-dom'
import { RoutePath } from '@/config/routes'

const ROUTES_WITHOUT_SIDEBAR = [RoutePath.Auth]

function App() {
  const location = useLocation()
  const showSidebar = !ROUTES_WITHOUT_SIDEBAR.includes(location.pathname as typeof RoutePath.Auth)

  if (!showSidebar) {
    return <AppRoutes />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 flex-col">
        <SidebarTrigger />
        <PageLayout>
          <AppRoutes />
        </PageLayout>
      </main>
    </SidebarProvider>
  )
}

export default App
