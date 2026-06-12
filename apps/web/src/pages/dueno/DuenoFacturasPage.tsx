import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Receipt, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'ACTIVA' | 'PENDIENTE_ANULACION' | 'ANULADA';
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  sale: {
    total: number;
    cashier: { name: string };
    items: { quantity: number; unitPrice: number; product: { name: string } }[];
  };
}

const voidSchema = z.object({
  reason: z.string().min(5, 'El motivo debe tener al menos 5 caracteres'),
});
type VoidForm = z.infer<typeof voidSchema>;

const STATUS_BADGE: Record<Invoice['status'], { label: string; className: string; icon: typeof CheckCircle }> = {
  ACTIVA: { label: 'Activa', className: 'bg-brand-green/10 text-brand-deep', icon: CheckCircle },
  PENDIENTE_ANULACION: { label: 'Pendiente anulación', className: 'bg-amber-100 text-amber-700', icon: Clock },
  ANULADA: { label: 'Anulada', className: 'bg-red-100 text-red-600', icon: XCircle },
};

export function DuenoFacturasPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const branchId = user?.staffBranchId;

  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);

  const form = useForm<VoidForm>({ resolver: zodResolver(voidSchema), defaultValues: { reason: '' } });

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', branchId],
    queryFn: async () => { const { data } = await api.get(`/invoices/branch/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const approveVoid = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/invoices/${id}/void`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', branchId] });
      setVoidTarget(null);
      form.reset();
      toast({ title: 'Factura anulada correctamente' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const rejectVoid = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/reject-void`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', branchId] });
      setRejectTarget(null);
      toast({ title: 'Solicitud rechazada — factura reactivada' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const pendingCount = invoices.filter((i) => i.status === 'PENDIENTE_ANULACION').length;

  function fmt(date: string) {
    return new Date(date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Facturas</h1>
        <p className="text-sm text-slate-500">Gestiona las facturas y solicitudes de anulación de tu sucursal</p>
      </div>

      {pendingCount > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">
                {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} de anulación pendiente{pendingCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700">Un cajero ha solicitado anular una factura. Revisa abajo.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-slate-400">
          <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Sin facturas registradas</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const isVoided = inv.status === 'ANULADA';
            const isPending = inv.status === 'PENDIENTE_ANULACION';
            const badge = STATUS_BADGE[inv.status];
            const BadgeIcon = badge.icon;

            return (
              <Card
                key={inv.id}
                className={`transition-all ${isPending ? 'border-amber-300 shadow-amber-100 shadow' : isVoided ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Visual receipt with X for voided */}
                    <div className="relative flex-shrink-0 w-14 h-14 rounded-lg border-2 bg-slate-50 flex items-center justify-center">
                      <div className="text-center">
                        <Receipt className="h-5 w-5 text-slate-400 mx-auto" />
                        <p className="text-[9px] font-bold text-slate-600 leading-tight mt-0.5">{inv.invoiceNumber}</p>
                      </div>
                      {isVoided && (
                        <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-red-50/90">
                          <span className="text-3xl font-black text-red-500 rotate-12 leading-none select-none">✕</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <Badge className={`text-xs border-0 flex items-center gap-1 ${badge.className}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                        <span className={`font-bold text-sm ml-auto ${isVoided ? 'line-through text-slate-400' : 'text-brand-green'}`}>
                          Bs {Number(inv.sale.total).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {inv.sale.cashier.name} · {fmt(inv.createdAt)}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {inv.sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                      </p>
                      {isVoided && inv.voidReason && (
                        <p className="text-xs text-red-500 mt-1 font-medium">
                          Motivo: "{inv.voidReason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-amber-700 flex-1">
                        El cajero solicita anular esta factura
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
                        onClick={() => setRejectTarget(inv)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => { setVoidTarget(inv); form.reset({ reason: '' }); }}
                      >
                        Anular con motivo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve void dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(v) => { if (!v) { setVoidTarget(null); form.reset(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Anular factura {voidTarget?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((dto) => voidTarget && approveVoid.mutate({ id: voidTarget.id, reason: dto.reason }))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo de anulación</Label>
              <Textarea
                id="reason"
                placeholder="Ej: Mal registro, equivocación en el producto..."
                rows={3}
                {...form.register('reason')}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              Esta acción es irreversible. El stock de los productos se restituirá automáticamente.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setVoidTarget(null); form.reset(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={approveVoid.isPending}>
                {approveVoid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar anulación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject void dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => { if (!v) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud de anulación</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>¿Rechazar la solicitud de anulación de <strong>{rejectTarget?.invoiceNumber}</strong>?</p>
            <p className="text-slate-500">La factura volverá al estado <span className="font-medium text-brand-green">ACTIVA</span>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button
              disabled={rejectVoid.isPending}
              onClick={() => rejectTarget && rejectVoid.mutate(rejectTarget.id)}
            >
              {rejectVoid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
