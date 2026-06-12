import { useEffect, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCard, type TableData, type TableStatus } from './TableCard';
import { TableCheckoutDialog, ReservedTableDialog } from './TableCheckoutDialog';
import { ReceiptDialog, type ReceiptData } from '@/features/cajero/ReceiptDialog';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

interface Props {
  branchId: string;
}

type Filter = 'TODAS' | TableStatus;

const FILTERS: { key: Filter; label: string; dot?: string }[] = [
  { key: 'TODAS',             label: 'Todas' },
  { key: 'LIBRE',             label: 'Libres',     dot: 'bg-brand-green' },
  { key: 'OCUPADA',           label: 'Ocupadas',   dot: 'bg-red-500' },
  { key: 'RESERVADA',         label: 'Reservadas', dot: 'bg-amber-400' },
  { key: 'FUERA_DE_SERVICIO', label: 'Fuera',      dot: 'bg-slate-300' },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-16 bg-slate-100 rounded" />
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-3 w-12 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function TableGrid({ branchId }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('TODAS');
  const [checkoutTable, setCheckoutTable] = useState<TableData | null>(null);
  const [reservedTable, setReservedTable] = useState<TableData | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: tables, isLoading, isError, refetch } = useQuery<TableData[]>({
    queryKey: ['tables', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}/tables`);
      return data;
    },
    refetchInterval: 60_000,
  });

  const handleStatusChange = useCallback(
    (tableId: string, newStatus: TableStatus) => {
      queryClient.setQueryData<TableData[]>(['tables', branchId], (prev) =>
        prev?.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: newStatus,
                occupiedAt: newStatus === 'OCUPADA' ? new Date().toISOString() : newStatus === 'LIBRE' ? null : t.occupiedAt,
              }
            : t,
        ),
      );
    },
    [branchId, queryClient],
  );

  useEffect(() => {
    const socket = connectSocket(branchId);
    socket.on('table.status_changed', ({ tableId, status }: { tableId: string; status: TableStatus }) => {
      handleStatusChange(tableId, status);
    });
    return () => {
      socket.off('table.status_changed');
      disconnectSocket(branchId);
    };
  }, [branchId, handleStatusChange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
        <p>No se pudieron cargar las mesas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
        </Button>
      </div>
    );
  }

  if (!tables?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <p>Esta sucursal no tiene mesas registradas.</p>
      </div>
    );
  }

  const counts = tables.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visible = filter === 'TODAS' ? tables : tables.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      {/* Filtros con contadores */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ key, label, dot }) => {
          const count = key === 'TODAS' ? tables.length : (counts[key] ?? 0);
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all',
                filter === key
                  ? 'bg-brand-deep text-brand-cream border-brand-deep'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-brand-green/40 hover:text-slate-700',
              )}
            >
              {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
              {label}
              <span className={cn('tabular-nums font-bold', filter === key ? 'text-white/70' : 'text-slate-400')}>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          <p>Sin mesas en este estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
              onCheckout={setCheckoutTable}
              onReserved={setReservedTable}
            />
          ))}
        </div>
      )}

      {/* Cobro de mesa */}
      <TableCheckoutDialog
        table={checkoutTable}
        branchId={branchId}
        onClose={() => setCheckoutTable(null)}
        onCompleted={setReceipt}
      />

      {/* Check-in de reserva */}
      <ReservedTableDialog
        table={reservedTable}
        branchId={branchId}
        onClose={() => setReservedTable(null)}
      />

      {/* Ticket imprimible */}
      <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
