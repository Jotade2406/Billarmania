import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCard, type TableData, type TableStatus } from './TableCard';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface Props {
  branchId: string;
}

export function TableGrid({ branchId }: Props) {
  const queryClient = useQueryClient();

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
        prev?.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t)),
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
      <div className="flex items-center justify-center h-48 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando mesas...</span>
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

  const counts = {
    LIBRE: tables.filter((t) => t.status === 'LIBRE').length,
    OCUPADA: tables.filter((t) => t.status === 'OCUPADA').length,
    RESERVADA: tables.filter((t) => t.status === 'RESERVADA').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {counts.LIBRE} libre{counts.LIBRE !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {counts.OCUPADA} ocupada{counts.OCUPADA !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {counts.RESERVADA} reservada{counts.RESERVADA !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
