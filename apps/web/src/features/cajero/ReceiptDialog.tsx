import { CheckCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export interface ReceiptData {
  invoiceNumber: string;
  customerName?: string | null;
  paymentMethod?: string | null;
  /** Línea de tiempo de mesa, ej: "Mesa 3 · 1h 24min" */
  tableLine?: { label: string; amount: number } | null;
  items: { label: string; amount: number }[];
  /** Anticipo de reserva descontado */
  prepaid?: number | null;
  total: number;
  /** Título del dialog (default: "Venta registrada") */
  title?: string;
  /** Fecha del documento (default: ahora) */
  dateStr?: string;
}

const PM_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  QR: 'QR Bancario',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
};

export function ReceiptDialog({ receipt, onClose }: { receipt: ReceiptData | null; onClose: () => void }) {
  const gross = receipt
    ? (receipt.tableLine?.amount ?? 0) + receipt.items.reduce((a, i) => a + i.amount, 0)
    : 0;

  return (
    <Dialog open={!!receipt} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-brand-green">
            <CheckCircle className="h-5 w-5" />
            {receipt?.title ?? 'Venta registrada'}
          </DialogTitle>
        </DialogHeader>

        {receipt && (
          <>
            {/* Contenido del ticket (esto es lo que se imprime) */}
            <div className="print-receipt space-y-3 font-mono text-sm">
              <div className="text-center border-b border-dashed pb-3">
                <p className="font-bold text-lg tracking-wide">BILLARMANIA</p>
                <p className="text-muted-foreground text-xs mt-0.5">Factura N° {receipt.invoiceNumber}</p>
                <p className="text-muted-foreground/60 text-[10px]">{receipt.dateStr ?? new Date().toLocaleString('es-BO')}</p>
              </div>

              <div className="text-xs space-y-0.5">
                <p>Cliente: {receipt.customerName || 'Consumidor final'}</p>
                {receipt.paymentMethod && (
                  <p>Pago: {PM_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                {receipt.tableLine && (
                  <div className="flex justify-between gap-2 font-semibold">
                    <span className="truncate">{receipt.tableLine.label}</span>
                    <span className="tabular-nums flex-shrink-0">Bs {receipt.tableLine.amount.toFixed(2)}</span>
                  </div>
                )}
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    <span className="tabular-nums flex-shrink-0">Bs {item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed pt-2 space-y-1">
                {receipt.prepaid != null && receipt.prepaid > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">Bs {gross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Anticipo reserva</span>
                      <span className="tabular-nums">- Bs {receipt.prepaid.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL A PAGAR</span>
                  <span className="tabular-nums">Bs {receipt.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground pt-1">¡Gracias por su visita!</p>
            </div>

            {/* Acciones (no se imprimen) */}
            <div className="flex gap-2 no-print">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir ticket
              </Button>
              <Button className="flex-1 rounded-xl bg-brand-deep hover:bg-brand-green" onClick={onClose}>
                Listo
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
