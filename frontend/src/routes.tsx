import RoleRoute from '@/components/auth/RoleRoute'
import { ROLE_HOME, RoutePath } from '@/config/routes'
import AuctionLive from '@/pages/AuctionLive'
import BlocklistPreferences from '@/pages/BlocklistPreferences'
import CompanyAuctions from '@/pages/CompanyAuctions'
import CompanyDashboard from '@/pages/CompanyDashboard'
import CompanyProfile from '@/pages/CompanyProfile'
import CompanyPublicProfile from '@/pages/CompanyPublicProfile'
import DriverAuction from '@/pages/DriverAuction'
import DriverAuctions from '@/pages/DriverAuctions'
import DriverDashboard from '@/pages/DriverDashboard'
import DriverProfile from '@/pages/DriverProfile'
import DriverPublicProfile from '@/pages/DriverPublicProfile'
import DriverRevenueCenter from '@/pages/DriverRevenueCenter'
import LoadDetail from '@/pages/LoadDetail'
import LoadEdit from '@/pages/LoadEdit'
import MapPage from '@/pages/Map'
import Messages from '@/pages/Messages'
import NotFound from '@/pages/NotFound'
import PostLoad from '@/pages/PostLoad'
import ReportFraud from '@/pages/ReportFraud'
import ReportHub from '@/pages/ReportHub'
import ReportInaccurate from '@/pages/ReportInaccurate'
import Test from '@/pages/Test'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminDocuments from '@/pages/admin/AdminDocuments'
import AdminRateConfirmations from '@/pages/admin/AdminRateConfirmations'
import AdminReports from '@/pages/admin/AdminReports'
import AdminUsers from '@/pages/admin/AdminUsers'
import { selectRole } from '@/services/authSlice'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'

function RoleHomeRedirect() {
  const role = useSelector(selectRole)
  if (!role) return <NotFound />
  return <Navigate to={ROLE_HOME[role]} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleHomeRedirect />} />

      {/* Driver routes */}
      <Route
        path={RoutePath.Dashboard}
        element={
          <RoleRoute path={RoutePath.Dashboard}>
            <DriverRevenueCenter />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.DriverLoads}
        element={
          <RoleRoute path={RoutePath.DriverLoads}>
            <DriverDashboard />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.DriverAuctions}
        element={
          <RoleRoute path={RoutePath.DriverAuctions}>
            <DriverAuctions />
          </RoleRoute>
        }
      />
      <Route
        path={`${RoutePath.DriverAuctions}/:loadId`}
        element={
          <RoleRoute path={RoutePath.DriverAuctions}>
            <DriverAuction />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.DriverProfile}
        element={
          <RoleRoute path={RoutePath.DriverProfile}>
            <DriverProfile />
          </RoleRoute>
        }
      />

      {/* Company routes */}
      <Route
        path={RoutePath.CompanyDashboard}
        element={
          <RoleRoute path={RoutePath.CompanyDashboard}>
            <CompanyDashboard />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.CompanyAuctions}
        element={
          <RoleRoute path={RoutePath.CompanyAuctions}>
            <CompanyAuctions />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.CompanyProfile}
        element={
          <RoleRoute path={RoutePath.CompanyProfile}>
            <CompanyProfile />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.PostLoad}
        element={
          <RoleRoute path={RoutePath.PostLoad}>
            <PostLoad />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.LoadDetail}
        element={
          <RoleRoute path={RoutePath.LoadDetail}>
            <LoadDetail />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.LoadEdit}
        element={
          <RoleRoute path={RoutePath.LoadEdit}>
            <LoadEdit />
          </RoleRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path={RoutePath.AdminDashboard}
        element={
          <RoleRoute path={RoutePath.AdminDashboard}>
            <AdminDashboard />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.AdminDocuments}
        element={
          <RoleRoute path={RoutePath.AdminDocuments}>
            <AdminDocuments />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.AdminUsers}
        element={
          <RoleRoute path={RoutePath.AdminUsers}>
            <AdminUsers />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.AdminRateConfirmations}
        element={
          <RoleRoute path={RoutePath.AdminRateConfirmations}>
            <AdminRateConfirmations />
          </RoleRoute>
        }
      />
      <Route
        path={RoutePath.AdminReports}
        element={
          <RoleRoute path={RoutePath.AdminReports}>
            <AdminReports />
          </RoleRoute>
        }
      />

      {/* Auction live — used by both company and driver */}
      <Route
        path={RoutePath.AuctionLive}
        element={
          <RoleRoute path={RoutePath.AuctionLive}>
            <AuctionLive />
          </RoleRoute>
        }
      />
      <Route
        path={`${RoutePath.AuctionLive}/:loadId`}
        element={
          <RoleRoute path={RoutePath.AuctionLive}>
            <AuctionLive />
          </RoleRoute>
        }
      />

      {/* Messages archive — driver and company */}
      <Route
        path={RoutePath.Messages}
        element={
          <RoleRoute path={RoutePath.Messages}>
            <Messages />
          </RoleRoute>
        }
      />

      {/* Public / shared routes */}
      <Route path={RoutePath.DriverPublicProfile} element={<DriverPublicProfile />} />
      <Route path={RoutePath.CompanyPublicProfile} element={<CompanyPublicProfile />} />
      <Route path={RoutePath.BlocklistPreferences} element={<BlocklistPreferences />} />
      <Route path={RoutePath.Report} element={<ReportHub />} />
      <Route path={RoutePath.ReportFraud} element={<ReportFraud />} />
      <Route path={RoutePath.ReportInaccurate} element={<ReportInaccurate />} />
      <Route path={RoutePath.Map} element={<MapPage />} />
      <Route path={RoutePath.Test} element={<Test />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
