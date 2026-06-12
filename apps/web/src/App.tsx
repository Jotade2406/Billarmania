import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DuenoLayout } from '@/pages/dueno/DuenoLayout';
import { DuenoOverviewPage } from '@/pages/dueno/DuenoOverviewPage';
import { DuenoMesasPage } from '@/pages/dueno/DuenoMesasPage';
import { DuenoReservasPage } from '@/pages/dueno/DuenoReservasPage';
import { DuenoConfigPage } from '@/pages/dueno/DuenoConfigPage';
import { DuenoInventarioPage } from '@/pages/dueno/DuenoInventarioPage';
import { DuenoVentasPage } from '@/pages/dueno/DuenoVentasPage';
import { DuenoFacturasPage } from '@/pages/dueno/DuenoFacturasPage';
import { DuenoAnunciosPage } from '@/pages/dueno/DuenoAnunciosPage';
import { DuenoPromosPage } from '@/pages/dueno/DuenoPromosPage';
import { SuperAdminLayout } from '@/pages/superadmin/SuperAdminLayout';
import { SuperAdminBranchesPage } from '@/pages/superadmin/SuperAdminBranchesPage';
import { SuperAdminUsersPage } from '@/pages/superadmin/SuperAdminUsersPage';
import { useAuthStore } from '@/store/auth.store';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'CAJERO') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'DUENO') return <Navigate to="/dueno" replace />;
  return <Navigate to="/superadmin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Cajero */}
      <Route element={<ProtectedRoute allowedRoles={['CAJERO']} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Dueño */}
      <Route element={<ProtectedRoute allowedRoles={['DUENO']} />}>
        <Route path="/dueno" element={<DuenoLayout />}>
          <Route index element={<DuenoOverviewPage />} />
          <Route path="mesas" element={<DuenoMesasPage />} />
          <Route path="reservas" element={<DuenoReservasPage />} />
          <Route path="inventario" element={<DuenoInventarioPage />} />
          <Route path="ventas" element={<DuenoVentasPage />} />
          <Route path="facturas" element={<DuenoFacturasPage />} />
          <Route path="anuncios" element={<DuenoAnunciosPage />} />
          <Route path="promos" element={<DuenoPromosPage />} />
          <Route path="config" element={<DuenoConfigPage />} />
        </Route>
      </Route>

      {/* Super Admin */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminBranchesPage />} />
          <Route path="users" element={<SuperAdminUsersPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
