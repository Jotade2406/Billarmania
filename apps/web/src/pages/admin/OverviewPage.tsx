import { useQuery } from '@tanstack/react-query';
import { Building2, LayoutGrid, ClipboardList, TrendingUp, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface Chain { id: string; name: string; _count: { branches: number }; }
interface Stats {
  tables: { LIBRE: number; OCUPADA: number; RESERVADA: number; FUERA_DE_SERVICIO: number; total: number };
  reservationsToday: number;
  pendingReservations: number;
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub: string;
  icon: React.FC<{ className?: string }>; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
    </div>
  );
}

export function OverviewPage() {
  const { user } = useAuthStore();

  const { data: chains = [] } = useQuery<Chain[]>({
    queryKey: ['chains-mine'],
    queryFn: async () => { const { data } = await api.get('/chains/mine'); return data; },
  });

  const firstChain = chains[0];

  const { data: branches = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['branches-overview', firstChain?.id],
    queryFn: async () => { const { data } = await api.get(`/chains/${firstChain!.id}/branches`); return data; },
    enabled: !!firstChain,
  });

  const firstBranch = branches[0];

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats', firstBranch?.id],
    queryFn: async () => { const { data } = await api.get(`/branches/${firstBranch!.id}/stats`); return data; },
    enabled: !!firstBranch,
    refetchInterval: 30_000,
  });

  const totalBranches = chains.reduce((acc, c) => acc + c._count.branches, 0);
  const occupancy = stats
    ? Math.round(((stats.tables.OCUPADA + stats.tables.RESERVADA) / (stats.tables.total || 1)) * 100)
    : null;

  const tableRows = stats ? [
    { label: 'Libres',            value: stats.tables.LIBRE,              bar: '#22c55e', textColor: 'text-brand-green' },
    { label: 'Ocupadas',          value: stats.tables.OCUPADA,            bar: '#ef4444', textColor: 'text-red-500' },
    { label: 'Reservadas',        value: stats.tables.RESERVADA,          bar: '#f59e0b', textColor: 'text-amber-500' },
    { label: 'Fuera de servicio', value: stats.tables.FUERA_DE_SERVICIO,  bar: '#94a3b8', textColor: 'text-slate-400' },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Bienvenido, <span className="text-slate-700">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Resumen de tu operación en Billarmania</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Cadenas"
          value={chains.length}
          sub={`${totalBranches} sucursal${totalBranches !== 1 ? 'es' : ''}`}
          icon={Building2}
          color="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Mesas activas"
          value={stats?.tables.OCUPADA ?? '—'}
          sub={`de ${stats?.tables.total ?? '—'} totales`}
          icon={LayoutGrid}
          color="bg-red-50 text-red-500"
        />
        <KpiCard
          label="Reservas hoy"
          value={stats?.reservationsToday ?? '—'}
          sub={`${stats?.pendingReservations ?? 0} pendiente${stats?.pendingReservations !== 1 ? 's' : ''} de revisar`}
          icon={ClipboardList}
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Ocupación"
          value={occupancy !== null ? `${occupancy}%` : '—'}
          sub="mesas ocupadas + reservadas"
          icon={TrendingUp}
          color="bg-brand-green/5 text-brand-green"
        />
      </div>

      {/* Status breakdown + mini occupancy */}
      {stats && (
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Bar breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">{firstBranch?.name ?? 'Sucursal'}</p>
            </div>
            <div className="space-y-3">
              {tableRows.map(({ label, value, bar, textColor }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bar }} />
                  <span className="text-sm text-slate-600 flex-1">{label}</span>
                  <span className={cn('text-sm font-bold tabular-nums', textColor)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupancy ring (simple) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col items-center justify-center gap-2">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke={occupancy! > 70 ? '#ef4444' : occupancy! > 40 ? '#f59e0b' : '#22c55e'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - (occupancy ?? 0) / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-slate-900">{occupancy}%</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 text-center">Ocupación actual</p>
            <p className="text-xs text-slate-400">{stats.tables.OCUPADA + stats.tables.RESERVADA} de {stats.tables.total} mesas</p>
          </div>
        </div>
      )}
    </div>
  );
}
