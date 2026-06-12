import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LayoutGrid, ClipboardList, TrendingUp, Banknote, ArrowRight, AlertCircle, Activity } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Stats {
  tables: { LIBRE: number; OCUPADA: number; RESERVADA: number; FUERA_DE_SERVICIO: number; total: number };
  reservationsToday: number;
  pendingReservations: number;
}

interface Sale {
  id: string;
  total: number;
  createdAt: string;
  invoice?: { status: string };
}

function KpiCard({ label, value, sub, icon: Icon, color, valueColor }: {
  label: string; value: string | number; sub: string;
  icon: React.FC<{ className?: string }>; color: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={cn('text-3xl font-black tracking-tight tabular-nums', valueColor ?? 'text-slate-900')}>{value}</p>
      <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
    </div>
  );
}

export function DuenoOverviewPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId;

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/stats`); return data; },
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales', branchId],
    queryFn: async () => { const { data } = await api.get(`/sales/branch/${branchId}`); return data; },
    enabled: !!branchId,
    refetchInterval: 60_000,
  });

  if (!branchId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <AlertCircle className="h-8 w-8 opacity-40" />
        <p>Tu cuenta no tiene una sucursal asignada. Contacta al administrador.</p>
      </div>
    );
  }

  const today = new Date().toDateString();
  const salesToday = sales.filter(
    (s) => new Date(s.createdAt).toDateString() === today && s.invoice?.status !== 'ANULADA',
  );
  const revenueToday = salesToday.reduce((acc, s) => acc + Number(s.total), 0);

  const occupancy = stats
    ? Math.round(((stats.tables.OCUPADA + stats.tables.RESERVADA) / (stats.tables.total || 1)) * 100)
    : null;

  const tableRows = stats ? [
    { label: 'Libres',            value: stats.tables.LIBRE,             bar: '#22c55e' },
    { label: 'Ocupadas',          value: stats.tables.OCUPADA,           bar: '#ef4444' },
    { label: 'Reservadas',        value: stats.tables.RESERVADA,         bar: '#f59e0b' },
    { label: 'Fuera de servicio', value: stats.tables.FUERA_DE_SERVICIO, bar: '#94a3b8' },
  ] : [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Pending alert */}
      {(stats?.pendingReservations ?? 0) > 0 && (
        <Link
          to="/dueno/reservas"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 hover:bg-amber-100/70 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {stats!.pendingReservations} comprobante{stats!.pendingReservations !== 1 ? 's' : ''} esperando revisión
            </p>
            <p className="text-xs text-amber-600">Los clientes esperan confirmación de su pago</p>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos hoy"
          value={`Bs ${revenueToday.toFixed(0)}`}
          sub={`${salesToday.length} venta${salesToday.length !== 1 ? 's' : ''} registrada${salesToday.length !== 1 ? 's' : ''}`}
          icon={Banknote}
          color="bg-brand-green/5 text-brand-green"
          valueColor="text-brand-green"
        />
        <KpiCard
          label="Mesas ocupadas"
          value={stats?.tables.OCUPADA ?? '—'}
          sub={`de ${stats?.tables.total ?? '—'} mesas`}
          icon={LayoutGrid}
          color="bg-red-50 text-red-500"
        />
        <KpiCard
          label="Reservas hoy"
          value={stats?.reservationsToday ?? '—'}
          sub={`${stats?.pendingReservations ?? 0} por revisar`}
          icon={ClipboardList}
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Ocupación"
          value={occupancy !== null ? `${occupancy}%` : '—'}
          sub="ocupadas + reservadas"
          icon={TrendingUp}
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Breakdown + ring */}
      {stats && (
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Estado de mesas</p>
            </div>
            <div className="space-y-3">
              {tableRows.map(({ label, value, bar }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bar }} />
                  <span className="text-sm text-slate-600 flex-1">{label}</span>
                  <span className="text-sm font-bold tabular-nums text-slate-800">{value}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: bar,
                        width: `${Math.round((value / (stats.tables.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                <span className="text-xl font-black text-slate-900 tabular-nums">{occupancy}%</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500">Ocupación actual</p>
            <p className="text-xs text-slate-400">{stats.tables.OCUPADA + stats.tables.RESERVADA} de {stats.tables.total} mesas</p>
          </div>
        </div>
      )}
    </div>
  );
}
