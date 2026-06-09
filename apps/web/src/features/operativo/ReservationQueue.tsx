import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReservationCard, type ReservationData } from './ReservationCard';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Props {
  branchId: string;
}

export function ReservationQueue({ branchId }: Props) {
  const queryClient = useQueryClient();

  const { data: reservations, isLoading, isError, refetch } = useQuery<ReservationData[]>({
    queryKey: ['reservations-pending', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}/reservations`);
      return data;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();

    socket.on('reservation.created', () => {
      queryClient.invalidateQueries({ queryKey: ['reservations-pending', branchId] });
    });

    socket.on('reservation.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['reservations-pending', branchId] });
    });

    return () => {
      socket.off('reservation.created');
      socket.off('reservation.updated');
    };
  }, [branchId, queryClient]);

  function removeReservation(reservationId: string) {
    queryClient.setQueryData<ReservationData[]>(
      ['reservations-pending', branchId],
      (prev) => prev?.filter((r) => r.id !== reservationId) ?? [],
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Cargando reservas...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-3 text-slate-500">
        <p>No se pudieron cargar las reservas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
        </Button>
      </div>
    );
  }

  if (!reservations?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
        <CheckCheck className="h-8 w-8" />
        <p className="text-sm">Sin reservas pendientes de revisión</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((r) => (
        <ReservationCard key={r.id} reservation={r} onResolved={removeReservation} />
      ))}
    </div>
  );
}
