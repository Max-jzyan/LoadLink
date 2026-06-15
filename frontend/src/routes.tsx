import { Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Loads from '@/pages/Loads'
import MapPage from '@/pages/Map'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/loads" element={<Loads />} />
      <Route path="/map" element={<MapPage />} />
    </Routes>
  )
}