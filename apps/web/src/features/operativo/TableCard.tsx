import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export type TableStatus = 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'FUERA_DE_SERVICIO';

export interface TableData {
  id: string;
  label: string;
  status: TableStatus;
  hourlyRate: string | null;
}

const STATUS_CONFIG: Record<TableStatus, { label: string; className: string }> = {
  LIBRE: {
    label: 'Libre',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
  },
  OCUPADA: {
    label: 'Ocupada',
    className: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
  },
  RESERVADA: {
    label: 'Reservada',
    className: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  },
  FUERA_DE_SERVICIO: {
    label: 'Fuera de servicio',
    className: 'bg-slate-100 border-slate-300 text-slate-500',
  },
};

const STATUS_DOT: Record<TableStatus, string> = {
  LIBRE: 'bg-emerald-500',
  OCUPADA: 'bg-red-500 animate-pulse',
  RESERVADA: 'bg-amber-500',
  FUERA_DE_SERVICIO: 'bg-slate-400',
};

interface Props {
  table: TableData;
  onStatusChange: (tableId: string, newStatus: TableStatus) => void;
}

export function TableCard({ table, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const config = STATUS_CONFIG[table.status];

  async function toggleStatus() {
    if (table.status === 'FUERA_DE_SERVICIO' || table.status === 'RESERVADA') return;

    const next: TableStatus = table.status === 'LIBRE' ? 'OCUPADA' : 'LIBRE';
    setLoading(true);
    try {
      await api.patch(`/tables/${table.id}/status`, { status: next });
      onStatusChange(table.id, next);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const isInteractive = table.status === 'LIBRE' || table.status === 'OCUPADA';

  return (
    <button
      onClick={toggleStatus}
      disabled={!isInteractive || loading}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 p-5 transition-all duration-150 min-h-[120px] w-full',
        config.className,
        !isInteractive && 'cursor-default opacity-70',
        loading && 'opacity-60',
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_DOT[table.status])} />
        <span className="font-semibold text-sm">{table.label}</span>
      </div>

      <span className="text-xs font-medium opacity-75">{config.label}</span>

      {table.hourlyRate && table.status === 'LIBRE' && (
        <span className="mt-1 text-xs opacity-60">Bs {table.hourlyRate}/h</span>
      )}

      {isInteractive && (
        <span className="mt-2 text-xs underline underline-offset-2 opacity-50">
          {table.status === 'LIBRE' ? 'Clic para ocupar' : 'Clic para liberar'}
        </span>
      )}
    </button>
  );
}
