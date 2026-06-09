import { useQuery } from '@tanstack/react-query';
import { Building2, LayoutGrid, ClipboardList, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Chain {
  id: string;
  name: string;
  _count: { branches: number };
}

interface Stats {
  tables: { LIBRE: number; OCUPADA: number; RESERVADA: number; FUERA_DE_SERVICIO: number; total: number };
  reservationsToday: number;
  pendingReservations: number;
}

export function OverviewPage() {
  const { user } = useAuthStore();

  const { data: chains = [] } = useQuery<Chain[]>({
    queryKey: ['chains-mine'],
    queryFn: async () => {
      const { data } = await api.get('/chains/mine');
      return data;
    },
  });

  const firstChain = chains[0];

  const { data: branches = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['branches-overview', firstChain?.id],
    queryFn: async () => {
      const { data } = await api.get(`/chains/${firstChain!.id}/branches`);
      return data;
    },
    enabled: !!firstChain,
  });

  const firstBranch = branches[0];

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats', firstBranch?.id],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${firstBranch!.id}/stats`);
      return data;
    },
    enabled: !!firstBranch,
    refetchInterval: 30_000,
  });

  const totalBranches = chains.reduce((acc, c) => acc + c._count.branches, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bienvenido, {user?.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Resumen general de tu operación en Billarmania
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Cadenas</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{chains.length}</p>
            <p className="text-xs text-slate-500 mt-1">{totalBranches} sucursal{totalBranches !== 1 ? 'es' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Mesas activas</CardTitle>
            <LayoutGrid className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.tables.OCUPADA ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">
              de {stats?.tables.total ?? '—'} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Reservas hoy</CardTitle>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.reservationsToday ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.pendingReservations ?? 0} pendiente{stats?.pendingReservations !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Ocupación</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats
                ? `${Math.round(((stats.tables.OCUPADA + stats.tables.RESERVADA) / (stats.tables.total || 1)) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">ocupación actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Table status breakdown */}
      {stats && (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado de mesas — {firstBranch?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Libres', value: stats.tables.LIBRE, color: 'bg-emerald-500' },
              { label: 'Ocupadas', value: stats.tables.OCUPADA, color: 'bg-red-500' },
              { label: 'Reservadas', value: stats.tables.RESERVADA, color: 'bg-amber-500' },
              { label: 'Fuera de servicio', value: stats.tables.FUERA_DE_SERVICIO, color: 'bg-slate-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-sm text-slate-600 flex-1">{label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
