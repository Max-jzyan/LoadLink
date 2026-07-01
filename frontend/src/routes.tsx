import { RoutePath } from '@/config/routes'
import AuctionLive from '@/pages/AuctionLive'
import CompanyDashboard from '@/pages/CompanyDashboard'
import Dashboard from '@/pages/Dashboard'
import DriverAuction from '@/pages/DriverAuction'
import DriverAuctions from '@/pages/DriverAuctions'
import DriverDashboard from '@/pages/DriverDashboard'
import DriverProfile from '@/pages/DriverProfile'
import LoadDetail from '@/pages/LoadDetail'
import Loads from '@/pages/Loads'
import MapPage from '@/pages/Map'
import NotFound from '@/pages/NotFound'
import PostLoad from '@/pages/PostLoad'
import Test from '@/pages/Test'
import { Navigate, Route, Routes } from 'react-router-dom'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={RoutePath.Dashboard} replace />} />
      <Route path={RoutePath.Dashboard} element={<Dashboard />} />
      <Route path={RoutePath.CompanyDashboard} element={<CompanyDashboard />} />
      <Route path={RoutePath.Test} element={<Test />} />
      <Route path={RoutePath.DriverLoads} element={<DriverDashboard />} />
      <Route path={RoutePath.DriverAuctions} element={<DriverAuctions />} />
      <Route path={`${RoutePath.DriverAuctions}/:loadId`} element={<DriverAuction />} />
      <Route path={RoutePath.DriverProfile} element={<DriverProfile />} />
      <Route path={RoutePath.Loads} element={<Loads />} />
      <Route path={RoutePath.PostLoad} element={<PostLoad />} />
      {/* load detail/edit are stubs -- not yet implemented */}
      <Route path={RoutePath.LoadDetail} element={<LoadDetail />} />
      <Route path={RoutePath.LoadEdit} element={<LoadDetail />} />
      {/* TODO: remove the bare AuctionLive route after MVP -- used for sidebar testing */}
      <Route path={RoutePath.AuctionLive} element={<AuctionLive />} />
      <Route path={`${RoutePath.AuctionLive}/:loadId`} element={<AuctionLive />} />
      <Route path={RoutePath.Map} element={<MapPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
