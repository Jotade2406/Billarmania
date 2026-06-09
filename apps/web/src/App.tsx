import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { OverviewPage } from '@/pages/admin/OverviewPage';
import { BranchesPage } from '@/pages/admin/BranchesPage';
import { BranchDetailPage } from '@/pages/admin/BranchDetailPage';
import { ReservationsHistoryPage } from '@/pages/admin/ReservationsHistoryPage';
import { StaffPage } from '@/pages/admin/StaffPage';
import { useAuthStore } from '@/store/auth.store';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'CAJERO' ? '/dashboard' : '/admin'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Cajero */}
      <Route element={<ProtectedRoute allowedRoles={['CAJERO']} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Dueño / Super Admin */}
      <Route element={<ProtectedRoute allowedRoles={['DUENO', 'SUPER_ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="branches/:branchId" element={<BranchDetailPage />} />
          <Route path="reservations" element={<ReservationsHistoryPage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
