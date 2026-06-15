import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import PageLayout from '@/components/PageLayout'
import AppRoutes from '@/routes'

function App() {
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
