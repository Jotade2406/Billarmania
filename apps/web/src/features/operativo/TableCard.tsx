import { useEffect, useState } from 'react';
import { Loader2, Wrench, Timer, HandCoins, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export type TableStatus = 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'FUERA_DE_SERVICIO';

export interface TableData {
  id: string;
  label: string;
  status: TableStatus;
  hourlyRate: string | null;
  occupiedAt: string | null;
}

export function elapsedMinutes(occupiedAt: string | null): number {
  if (!occupiedAt) return 0;
  return Math.max(1, Math.ceil((Date.now() - new Date(occupiedAt).getTime()) / 60000));
}

export function fmtElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

const STATUS_CONFIG: Record<TableStatus, {
  label: string;
  strip: string;
  dot: string;
  pill: string;
  card: string;
}> = {
  LIBRE: {
    label: 'Libre',
    strip: 'bg-brand-green',
    dot: 'bg-brand-green',
    pill: 'bg-brand-green/10 text-brand-deep',
    card: 'hover:border-brand-green/50 hover:shadow-lg hover:shadow-brand-green/10 cursor-pointer',
  },
  OCUPADA: {
    label: 'Ocupada',
    strip: 'bg-red-500',
    dot: 'bg-red-500 animate-pulse',
    pill: 'bg-red-50 text-red-600',
    card: 'hover:border-red-300 hover:shadow-lg hover:shadow-red-100/60 cursor-pointer',
  },
  RESERVADA: {
    label: 'Reservada',
    strip: 'bg-amber-400',
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700',
    card: 'hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/60 cursor-pointer',
  },
  FUERA_DE_SERVICIO: {
    label: 'Fuera de servicio',
    strip: 'bg-slate-300',
    dot: 'bg-slate-300',
    pill: 'bg-slate-100 text-slate-500',
    card: 'opacity-60',
  },
};

interface Props {
  table: TableData;
  onStatusChange: (tableId: string, newStatus: TableStatus) => void;
  onCheckout: (table: TableData) => void;
  onReserved: (table: TableData) => void;
}

export function TableCard({ table, onStatusChange, onCheckout, onReserved }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const config = STATUS_CONFIG[table.status];

  // Tick por minuto para refrescar el cronómetro
  const [, setTick] = useState(0);
  useEffect(() => {
    if (table.status !== 'OCUPADA' || !table.occupiedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [table.status, table.occupiedAt]);

  async function occupy() {
    setLoading(true);
    try {
      await api.patch(`/tables/${table.id}/status`, { status: 'OCUPADA' });
      onStatusChange(table.id, 'OCUPADA');
    } catch {
      toast({ title: 'Error', description: 'No se pudo ocupar la mesa.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (loading) return;
    if (table.status === 'LIBRE') occupy();
    else if (table.status === 'OCUPADA') onCheckout(table);
    else if (table.status === 'RESERVADA') onReserved(table);
  }

  const isInteractive = table.status !== 'FUERA_DE_SERVICIO';
  const minutes = table.status === 'OCUPADA' ? elapsedMinutes(table.occupiedAt) : 0;
  const rate = table.hourlyRate ? Number(table.hourlyRate) : 0;
  // Mismo redondeo que el backend: Bs enteros hacia arriba
  const runningAmount = Math.ceil(rate * (minutes / 60));

  return (
    <button
      onClick={handleClick}
      disabled={!isInteractive || loading}
      className={cn(
        'group relative flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden text-left transition-all duration-150 w-full',
        config.card,
        loading && 'opacity-60',
        !isInteractive && 'cursor-default',
      )}
    >
      <div className={cn('h-1 w-full', config.strip)} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-bold text-slate-900 leading-tight tracking-tight">{table.label}</p>
          {table.status === 'FUERA_DE_SERVICIO' && <Wrench className="h-3.5 w-3.5 text-slate-300 mt-1" />}
        </div>

        <div className={cn('inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold', config.pill)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
          {config.label}
        </div>

        {/* Cronómetro de sesión */}
        {table.status === 'OCUPADA' && table.occupiedAt && (
          <div className="flex items-center justify-between bg-red-50/60 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 tabular-nums">
              <Timer className="h-3 w-3" />
              {fmtElapsed(minutes)}
            </span>
            {rate > 0 && (
              <span className="text-[11px] font-bold text-slate-600 tabular-nums">Bs {runningAmount}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-end justify-between mt-auto pt-1">
          {table.hourlyRate ? (
            <p className="text-xs text-slate-400 font-medium tabular-nums">Bs {Number(table.hourlyRate).toFixed(0)}/h</p>
          ) : <span />}

          {table.status === 'LIBRE' && (
            <span className="text-[11px] font-bold text-brand-green opacity-0 group-hover:opacity-100 transition-opacity">
              Ocupar →
            </span>
          )}
          {table.status === 'OCUPADA' && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <HandCoins className="h-3 w-3" /> Cobrar
            </span>
          )}
          {table.status === 'RESERVADA' && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <UserCheck className="h-3 w-3" /> Check-in
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
