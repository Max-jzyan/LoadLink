import { Navigate, Routes, Route } from 'react-router-dom'
import { RoutePath } from '@/config/routes'
import Dashboard from '@/pages/Dashboard'
import Loads from '@/pages/Loads'
import MapPage from '@/pages/Map'
import DriverLoads from '@/pages/DriverLoads'
import Test from './pages/Test'
import DriverAuction from '@/pages/DriverAuction'
import PostLoad from '@/pages/PostLoad'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={RoutePath.Dashboard} replace />} />
      <Route path={RoutePath.Dashboard} element={<Dashboard />} />
      <Route path={RoutePath.Test} element={<Test />} />
      <Route path={RoutePath.DriverLoads} element={<DriverLoads />} />
      <Route path={RoutePath.DriverAuctions} element={<DriverAuction />} />
      <Route path={RoutePath.Loads} element={<Loads />} />
      <Route path={RoutePath.PostLoad} element={<PostLoad />} />
      <Route path={RoutePath.Map} element={<MapPage />} />
    </Routes>
  )
}
