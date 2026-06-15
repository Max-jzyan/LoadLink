import { Routes, Route } from 'react-router-dom'
import { RoutePath } from '@/config/routes'

import Dashboard from '@/pages/Dashboard'
import Loads from '@/pages/Loads'
import MapPage from '@/pages/Map'

export default function AppRoutes() {
  return (
    <Routes>

      <Route path={RoutePath.Dashboard} element={<Dashboard />} />
      <Route path={RoutePath.Loads} element={<Loads />} />
      <Route path={RoutePath.Map} element={<MapPage />} />
    </Routes>
  )
}
