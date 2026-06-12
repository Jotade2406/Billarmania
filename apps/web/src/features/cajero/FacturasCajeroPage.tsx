import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, AlertCircle, Loader2, Clock, Eye, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReceiptDialog, type ReceiptData } from './ReceiptDialog';
import { saleItemLabel } from './VentasPage';
import { fmtElapsed } from '@/features/operativo/TableCard';
import { api } from '@/lib/api';
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
    customerName: string | null;
    paymentMethod: string | null;
    tableLabel: string | null;
    tableMinutes: number | null;
    tableAmount: number | null;
    prepaidApplied: number | null;
    cashier: { name: string };
    items: { quantity: number; unitPrice: number; subtotal?: number; product: { name: string } }[];
  };
}

function invoiceToReceipt(inv: Invoice): ReceiptData {
  return {
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.sale.customerName,
    paymentMethod: inv.sale.paymentMethod,
    tableLine: inv.sale.tableLabel && inv.sale.tableMinutes
      ? { label: `${inv.sale.tableLabel} · ${fmtElapsed(inv.sale.tableMinutes)}`, amount: Number(inv.sale.tableAmount ?? 0) }
      : null,
    items: inv.sale.items.map((i) => ({
      label: saleItemLabel(i),
      amount: Number(i.subtotal ?? i.quantity * Number(i.unitPrice)),
    })),
    prepaid: inv.sale.prepaidApplied ? Number(inv.sale.prepaidApplied) : null,
    total: Number(inv.sale.total),
    title: `Detalle ${inv.invoiceNumber}`,
    dateStr: new Date(inv.createdAt).toLocaleString('es-BO'),
  };
}

const STATUS_STYLES = {
  ACTIVA: 'bg-brand-green/10 text-brand-deep',
  PENDIENTE_ANULACION: 'bg-amber-100 text-amber-700',
  ANULADA: 'bg-red-100 text-red-600',
};

export function FacturasCajeroPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmVoid, setConfirmVoid] = useState<Invoice | null>(null);
  const [detail, setDetail] = useState<ReceiptData | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', branchId],
    queryFn: async () => { const { data } = await api.get(`/invoices/branch/${branchId}`); return data; },
  });

  const requestVoid = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/request-void`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', branchId] });
      setConfirmVoid(null);
      toast({ title: 'Solicitud de anulación enviada al dueño' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  function fmt(date: string) {
    return new Date(date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Mis facturas</h2>
          <p className="text-xs text-slate-500">Si hay un error en una factura, solicita anulación al dueño</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-slate-400">
          <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Sin facturas registradas</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id} className={inv.status === 'ANULADA' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Invoice number with void X overlay */}
                  <div className="relative flex-shrink-0 w-16 h-16 rounded-lg border-2 bg-slate-50 flex items-center justify-center">
                    <div className="text-center">
                      <Receipt className="h-5 w-5 text-slate-400 mx-auto" />
                      <p className="text-[10px] font-bold text-slate-600 leading-tight">{inv.invoiceNumber}</p>
                    </div>
                    {inv.status === 'ANULADA' && (
                      <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-red-50/80">
                        <span className="text-3xl font-black text-red-500 rotate-12 leading-none">✕</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <Badge className={`text-xs border-0 ${STATUS_STYLES[inv.status]}`}>
                        {inv.status === 'ACTIVA' ? 'Activa' : inv.status === 'PENDIENTE_ANULACION' ? 'Pendiente anulación' : 'Anulada'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{fmt(inv.createdAt)}</p>
                    <div className="text-sm mt-1 flex items-center gap-2 flex-wrap">
                      {inv.sale.tableLabel && inv.sale.tableMinutes ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-green/10 text-brand-deep px-2 py-0.5 rounded-full">
                          <Timer className="h-3 w-3" />
                          {inv.sale.tableLabel} · {fmtElapsed(inv.sale.tableMinutes)}
                        </span>
                      ) : null}
                      {inv.sale.items.length > 0 && (
                        <span className="text-slate-600">
                          {inv.sale.items.map(saleItemLabel).join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-brand-green mt-0.5">Bs {Number(inv.sale.total).toFixed(2)}</p>
                    {inv.status === 'ANULADA' && inv.voidReason && (
                      <p className="text-xs text-red-500 mt-1">Motivo: {inv.voidReason}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-brand-deep border-brand-green/30 hover:bg-brand-green/5"
                      onClick={() => setDetail(invoiceToReceipt(inv))}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Detalles
                    </Button>
                    {inv.status === 'ACTIVA' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={() => setConfirmVoid(inv)}
                      >
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        Solicitar anulación
                      </Button>
                    )}
                    {inv.status === 'PENDIENTE_ANULACION' && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        Esperando dueño
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detalle de factura (con impresión) */}
      <ReceiptDialog receipt={detail} onClose={() => setDetail(null)} />

      {/* Confirm void request dialog */}
      <Dialog open={!!confirmVoid} onOpenChange={(v) => { if (!v) setConfirmVoid(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Solicitar anulación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>¿Solicitar la anulación de la factura <strong>{confirmVoid?.invoiceNumber}</strong>?</p>
            <p className="text-slate-500">El dueño de la sucursal recibirá la solicitud y decidirá si anularla con un motivo.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
              Si la factura se anula, el stock de los productos se restituye automáticamente.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVoid(null)}>Cancelar</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={requestVoid.isPending}
              onClick={() => confirmVoid && requestVoid.mutate(confirmVoid.id)}
            >
              {requestVoid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
