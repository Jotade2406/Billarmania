import { useState } from 'react';
import { Check, X, Clock, User, Calendar, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface ReservationData {
  id: string;
  status: string;
  reservedFor: string;
  depositAmount: string;
  confirmationDeadline: string | null;
  user: { name: string; phone: string | null };
  table: { label: string };
  payment: {
    id: string;
    amount: string;
    proofUrl: string | null;
    status: string;
  } | null;
}

interface Props {
  reservation: ReservationData;
  onResolved: (reservationId: string) => void;
}

export function ReservationCard({ reservation, onResolved }: Props) {
  const [dialog, setDialog] = useState<'confirm' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { toast } = useToast();

  const reservedAt = new Date(reservation.reservedFor);
  const deadline = reservation.confirmationDeadline
    ? new Date(reservation.confirmationDeadline)
    : null;
  const minutesLeft = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60_000))
    : null;

  async function handleAction(action: 'confirm' | 'reject') {
    setLoading(true);
    try {
      await api.post(`/reservations/${reservation.id}/${action}`);
      toast({
        title: action === 'confirm' ? 'Reserva confirmada ✓' : 'Reserva rechazada',
        description:
          action === 'confirm'
            ? `Mesa ${reservation.table.label} reservada para ${reservation.user.name}`
            : `Se liberó la mesa ${reservation.table.label}`,
        variant: action === 'confirm' ? 'default' : 'destructive',
      });
      onResolved(reservation.id);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo procesar la acción.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDialog(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-amber-200 bg-amber-50/30">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-slate-900">{reservation.user.name}</p>
                {reservation.user.phone && (
                  <p className="text-xs text-slate-500">{reservation.user.phone}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-100">
              {reservation.table.label}
            </Badge>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {reservedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {reservedAt.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
            </span>
            <span className="font-medium text-slate-800">Bs {reservation.depositAmount}</span>
            {minutesLeft !== null && (
              <span
                className={`flex items-center gap-1 font-medium ${
                  minutesLeft <= 2 ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                <Clock className="h-3 w-3" />
                {minutesLeft} min para decidir
              </span>
            )}
          </div>

          {/* Proof image */}
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 min-h-[140px] flex items-center justify-center">
            {reservation.payment?.proofUrl && !imgError ? (
              <img
                src={reservation.payment.proofUrl}
                alt="Comprobante de pago"
                className="w-full object-contain max-h-56"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400 py-6">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Sin comprobante</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setDialog('confirm')}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-1" /> Confirmar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => setDialog('reject')}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" /> Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={dialog === 'confirm'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Confirmar reserva?</DialogTitle>
            <DialogDescription>
              Se confirmará la reserva de <strong>{reservation.user.name}</strong> para{' '}
              <strong>{reservation.table.label}</strong>. La mesa quedará en estado RESERVADA
              hasta que llegue el cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleAction('confirm')}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={dialog === 'reject'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Rechazar reserva?</DialogTitle>
            <DialogDescription>
              Se rechazará el comprobante de <strong>{reservation.user.name}</strong>. La mesa{' '}
              <strong>{reservation.table.label}</strong> volverá a estar LIBRE.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('reject')}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
