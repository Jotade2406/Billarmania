import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, User, Calendar, CalendarDays, Users, Banknote, QrCode, CreditCard, Landmark, Timer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { toInputDate, parseInputDate, saleItemLabel } from '@/features/cajero/VentasPage';
import { fmtElapsed } from '@/features/operativo/TableCard';

interface Sale {
  id: string;
  total: number;
  subtotal: number;
  status: 'COMPLETADA' | 'ANULADA';
  customerName: string | null;
  paymentMethod: string | null;
  tableLabel: string | null;
  tableMinutes: number | null;
  notes: string | null;
  createdAt: string;
  cashier: { id: string; name: string };
  items: { quantity: number; unitPrice: number; product: { name: string }; presentation?: { name: string; unitsPerSale: number } | null }[];
  invoice?: { invoiceNumber: string; status: string };
}

interface StaffMember { id: string; name: string; }

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
  all: 'Todo',
  custom: 'Fecha específica',
};

const PM_META: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  EFECTIVO:      { label: 'Efectivo',      icon: Banknote },
  QR:            { label: 'QR',            icon: QrCode },
  TARJETA:       { label: 'Tarjeta',       icon: CreditCard },
  TRANSFERENCIA: { label: 'Transferencia', icon: Landmark },
};

export function DuenoVentasPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId;
  const todayStr = toInputDate(new Date());

  const [period, setPeriod] = useState<Period>('today');
  const [customDate, setCustomDate] = useState(todayStr);
  const [cashierId, setCashierId] = useState<string>('ALL');

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ['sales', branchId],
    queryFn: async () => { const { data } = await api.get(`/sales/branch/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ['branch-staff', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/staff`); return data; },
    enabled: !!branchId,
  });

  // Cajeros disponibles: registrados en la sucursal + cualquiera que aparezca en ventas
  const cashierOptions = useMemo(() => {
    const map = new Map<string, string>();
    staff.forEach((s) => map.set(s.id, s.name));
    sales.forEach((s) => { if (!map.has(s.cashier.id)) map.set(s.cashier.id, s.cashier.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [staff, sales]);

  function inPeriod(dateIso: string) {
    const d = new Date(dateIso);
    const now = new Date();
    switch (period) {
      case 'today': return d.toDateString() === now.toDateString();
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      case 'week': { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
      case 'month': { const m = new Date(now); m.setDate(m.getDate() - 30); return d >= m; }
      case 'custom': return d.toDateString() === parseInputDate(customDate).toDateString();
      default: return true;
    }
  }

  const filtered = sales.filter((s) =>
    inPeriod(s.createdAt) && (cashierId === 'ALL' || s.cashier.id === cashierId),
  );
  const valid = filtered.filter((s) => s.invoice?.status !== 'ANULADA');
  const totalRevenue = valid.reduce((acc, s) => acc + Number(s.total), 0);
  const totalCount = valid.length;

  const byMethod = Object.entries(PM_META).map(([id, meta]) => ({
    id, ...meta,
    amount: valid.filter((s) => s.paymentMethod === id).reduce((a, s) => a + Number(s.total), 0),
  })).filter((m) => m.amount > 0);

  function fmt(date: string) {
    return new Date(date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="space-y-5">
      {/* Header + filtros */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registro de ventas</h1>
          <p className="text-sm text-slate-400 mt-1">Filtra por fecha y cajero para cuadrar caja</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cajero */}
          <Select value={cashierId} onValueChange={setCashierId}>
            <SelectTrigger className="w-44 rounded-xl bg-white">
              <Users className="h-3.5 w-3.5 mr-2 text-brand-green" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los cajeros</SelectItem>
              {cashierOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Período */}
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44 rounded-xl bg-white">
              <Calendar className="h-3.5 w-3.5 mr-2 text-brand-green" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Fecha específica */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 h-10">
              <CalendarDays className="h-4 w-4 text-brand-green" />
              <input
                type="date"
                value={customDate}
                max={todayStr}
                onChange={(e) => e.target.value && setCustomDate(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 min-w-[120px] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ventas</p>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 min-w-[160px] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total recaudado</p>
          <p className="text-2xl font-black text-brand-green mt-1 tabular-nums">Bs {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 min-w-[140px] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ticket promedio</p>
          <p className="text-2xl font-black text-slate-700 mt-1 tabular-nums">
            Bs {totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : '0.00'}
          </p>
        </div>
        {byMethod.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-1 min-w-[240px] shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Desglose por pago</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {byMethod.map(({ id, label, icon: Icon, amount }) => (
                <div key={id} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-brand-green" />
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-bold tabular-nums">Bs {amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[84px] rounded-2xl border border-slate-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center text-slate-400">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin ventas con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => {
            const isVoided = sale.invoice?.status === 'ANULADA';
            const pm = sale.paymentMethod ? PM_META[sale.paymentMethod] : null;
            return (
              <div
                key={sale.id}
                className={cn(
                  'bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 shadow-sm',
                  isVoided && 'opacity-50',
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                  isVoided ? 'bg-slate-100' : 'bg-brand-green/10',
                )}>
                  <TrendingUp className={cn('h-4 w-4', isVoided ? 'text-slate-400' : 'text-brand-green')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {sale.invoice && <span className="font-bold text-slate-900">{sale.invoice.invoiceNumber}</span>}
                    <span className={cn(
                      'font-bold text-base tabular-nums',
                      isVoided ? 'line-through text-slate-400' : 'text-brand-green',
                    )}>
                      Bs {Number(sale.total).toFixed(2)}
                    </span>
                    {isVoided && (
                      <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">ANULADA</span>
                    )}
                    {pm && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{pm.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                    <User className="h-3 w-3" />{sale.cashier.name} · {fmt(sale.createdAt)}
                    {sale.customerName && <span className="text-slate-400">· Cliente: {sale.customerName}</span>}
                  </p>
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                    {sale.tableLabel && sale.tableMinutes ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-green/10 text-brand-deep px-2 py-0.5 rounded-full">
                        <Timer className="h-3 w-3" />
                        {sale.tableLabel} · {fmtElapsed(sale.tableMinutes)}
                      </span>
                    ) : null}
                    {sale.items.length > 0 && (
                      <span>{sale.items.map(saleItemLabel).join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
