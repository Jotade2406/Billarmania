import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Timer, User, Wallet, Search, ChevronDown, Plus, Minus, X,
  Banknote, QrCode, CreditCard, Landmark, UserCheck, CalendarClock, HandCoins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { type TableData, elapsedMinutes, fmtElapsed } from './TableCard';
import type { ReceiptData } from '@/features/cajero/ReceiptDialog';
import { type Product, type Presentation, saleItemLabel } from '@/features/cajero/VentasPage';

interface Session {
  table: { id: string; label: string; status: string; hourlyRate: string | null; occupiedAt: string | null };
  minutes: number;
  rate: number;
  tableAmount: number;
  prepaid: number;
  reservation: {
    id: string;
    status: string;
    reservedFor: string;
    depositAmount: string;
    user: { name: string; phone: string | null };
  } | null;
}

const PAYMENT_METHODS = [
  { id: 'EFECTIVO',      label: 'Efectivo',      icon: Banknote },
  { id: 'QR',            label: 'QR',            icon: QrCode },
  { id: 'TARJETA',       label: 'Tarjeta',       icon: CreditCard },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Landmark },
];

// ════════════════════ COBRO DE MESA ════════════════════
export function TableCheckoutDialog({ table, branchId, onClose, onCompleted }: {
  table: TableData | null;
  branchId: string;
  onClose: () => void;
  onCompleted: (receipt: ReceiptData) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [items, setItems] = useState<{ product: Product; presentation: Presentation; quantity: number }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery<Session>({
    queryKey: ['table-session', table?.id],
    queryFn: async () => { const { data } = await api.get(`/tables/${table!.id}/session`); return data; },
    enabled: !!table,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', branchId],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${branchId}`); return data; },
    enabled: !!table,
  });

  // Prefill nombre si la mesa tiene reserva activa
  useEffect(() => {
    if (session?.reservation?.status === 'ACTIVA' && session.reservation.user?.name) {
      setCustomerName(session.reservation.user.name);
    }
  }, [session?.reservation?.id]);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!table) {
      setCustomerName(''); setPaymentMethod('EFECTIVO'); setItems([]);
      setPickerOpen(false); setPickerSearch('');
    }
  }, [table?.id]);

  // Cronómetro vivo (recalcula por minuto)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!table) return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [table?.id]);

  // Cerrar combobox al hacer clic afuera
  useEffect(() => {
    if (!pickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [pickerOpen]);

  const checkout = useMutation({
    mutationFn: () => api.post(`/sales/branch/${branchId}/table-checkout`, {
      tableId: table!.id,
      customerName: customerName.trim() || undefined,
      paymentMethod,
      items: items.map((i) => ({ presentationId: i.presentation.id, quantity: i.quantity })),
    }),
    onSuccess: (res) => {
      const sale = res.data.sale;
      qc.invalidateQueries({ queryKey: ['tables', branchId] });
      qc.invalidateQueries({ queryKey: ['sales', branchId] });
      qc.invalidateQueries({ queryKey: ['invoices', branchId] });
      qc.invalidateQueries({ queryKey: ['products', branchId] });
      onCompleted({
        invoiceNumber: res.data.invoice.invoiceNumber,
        customerName: sale.customerName,
        paymentMethod: sale.paymentMethod,
        tableLine: sale.tableMinutes
          ? { label: `${sale.tableLabel} · ${fmtElapsed(sale.tableMinutes)}`, amount: Number(sale.tableAmount) }
          : null,
        items: sale.items.map((i: any) => ({
          label: saleItemLabel(i),
          amount: Number(i.subtotal),
        })),
        prepaid: sale.prepaidApplied ? Number(sale.prepaidApplied) : null,
        total: Number(sale.total),
      });
      onClose();
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al cobrar la mesa', variant: 'destructive' }),
  });

  const freeWithoutCharge = useMutation({
    mutationFn: () => api.patch(`/tables/${table!.id}/status`, { status: 'LIBRE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] });
      toast({ title: 'Mesa liberada sin cobro' });
      onClose();
    },
    onError: () => toast({ title: 'No se pudo liberar la mesa', variant: 'destructive' }),
  });

  // Cálculos en vivo (mismo redondeo que el backend: Bs enteros hacia arriba)
  const minutes = table ? elapsedMinutes(table.occupiedAt) : 0;
  const rate = session?.rate ?? (table?.hourlyRate ? Number(table.hourlyRate) : 0);
  const tableAmount = Math.ceil(rate * (minutes / 60));
  const itemsTotal = items.reduce((acc, i) => acc + Number(i.presentation.price) * i.quantity, 0);
  const prepaid = session?.prepaid ?? 0;
  const gross = tableAmount + itemsTotal;
  const totalDue = Math.max(0, Math.round((gross - prepaid) * 100) / 100);

  const pickerRows = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .flatMap((p) => (p.presentations ?? []).map((pres) => ({ product: p, pres })));
  }, [products, pickerSearch]);

  function deductedInCart(productId: string, exceptPresId?: string) {
    return items
      .filter((i) => i.product.id === productId && i.presentation.id !== exceptPresId)
      .reduce((acc, i) => acc + i.quantity * i.presentation.unitsPerSale, 0);
  }

  function addItem(product: Product, pres: Presentation) {
    const used = deductedInCart(product.id, pres.id);
    const existing = items.find((i) => i.presentation.id === pres.id);
    const newQty = (existing?.quantity ?? 0) + 1;
    if (used + newQty * pres.unitsPerSale > product.stock) {
      toast({ title: `Stock insuficiente (quedan ${product.stock - used} ${product.unit})`, variant: 'destructive' });
      return;
    }
    setItems((prev) => existing
      ? prev.map((i) => i.presentation.id === pres.id ? { ...i, quantity: newQty } : i)
      : [...prev, { product, presentation: pres, quantity: 1 }],
    );
    setPickerOpen(false);
    setPickerSearch('');
  }

  function updateQty(presId: string, qty: number) {
    if (qty <= 0) { setItems((p) => p.filter((i) => i.presentation.id !== presId)); return; }
    const it = items.find((i) => i.presentation.id === presId);
    if (!it) return;
    const used = deductedInCart(it.product.id, presId);
    if (used + qty * it.presentation.unitsPerSale > it.product.stock) return;
    setItems((p) => p.map((i) => i.presentation.id === presId ? { ...i, quantity: qty } : i));
  }

  return (
    <Dialog open={!!table} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-brand-green" />
            Cobrar {table?.label}
          </DialogTitle>
        </DialogHeader>

        {/* Tiempo jugado */}
        <div className="bg-brand-ink rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Timer className="h-4 w-4 text-brand-mint" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Tiempo jugado</p>
              <p className="text-lg font-black text-brand-cream tabular-nums">
                {table?.occupiedAt ? fmtElapsed(minutes) : 'Sin registro'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-neutral-400 tabular-nums">Bs {rate.toFixed(0)}/hora</p>
            <p className="text-lg font-black text-brand-mint tabular-nums">Bs {tableAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Reserva vinculada */}
        {session?.reservation?.status === 'ACTIVA' && (
          <div className="flex items-center gap-2.5 bg-brand-green/5 border border-brand-green/20 rounded-xl px-3.5 py-2.5 text-xs">
            <UserCheck className="h-4 w-4 text-brand-green flex-shrink-0" />
            <p className="text-brand-deep">
              <strong>{session.reservation.user.name}</strong> reservó esta mesa — anticipo de{' '}
              <strong>Bs {Number(session.reservation.depositAmount).toFixed(2)}</strong> se descuenta del total.
            </p>
          </div>
        )}

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-brand-green" />Cliente
          </Label>
          <Input
            placeholder="Consumidor final"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 rounded-xl"
          />
        </div>

        {/* Método de pago */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-brand-green" />Método de pago
          </Label>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentMethod(id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-[10px] font-semibold transition-all',
                  paymentMethod === id
                    ? 'border-brand-green bg-brand-green/5 text-brand-deep'
                    : 'border-border text-muted-foreground hover:border-brand-green/40',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', paymentMethod === id ? 'text-brand-green' : 'text-muted-foreground/60')} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Consumo adicional */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Consumo adicional <span className="font-normal normal-case">(opcional)</span>
          </Label>
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className={cn(
                'w-full flex items-center justify-between gap-2 h-10 px-3.5 rounded-xl border bg-white text-sm transition-colors',
                pickerOpen ? 'border-brand-green ring-2 ring-brand-green/15' : 'border-input hover:border-brand-green/50',
              )}
            >
              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                <Search className="h-3.5 w-3.5" />
                Agregar bebidas, snacks...
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', pickerOpen && 'rotate-180')} />
            </button>

            {pickerOpen && (
              <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-border shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    placeholder="Filtrar..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full h-8 px-3 text-sm rounded-lg bg-muted outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {pickerRows.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">Sin productos</p>
                  ) : pickerRows.map(({ product: p, pres }) => {
                    const remaining = p.stock - deductedInCart(p.id);
                    const agotado = !pres.available || remaining < pres.unitsPerSale;
                    return (
                      <button
                        key={pres.id}
                        type="button"
                        disabled={agotado}
                        onClick={() => addItem(p, pres)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3.5 py-2 text-left',
                          agotado ? 'opacity-45 cursor-not-allowed' : 'hover:bg-brand-green/5',
                        )}
                      >
                        <span className="flex-1 text-sm font-medium truncate">
                          {p.name}
                          {pres.unitsPerSale > 1 && <span className="text-brand-green font-bold"> · {pres.name}</span>}
                        </span>
                        {agotado && (
                          <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">AGOTADO</span>
                        )}
                        <span className="text-xs font-bold text-brand-green tabular-nums">Bs {Number(pres.price).toFixed(2)}</span>
                        {!agotado && <Plus className="h-3 w-3 text-brand-green" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {items.map((item) => (
                <div key={item.presentation.id} className="flex items-center gap-2 px-3 py-2 bg-white">
                  <p className="flex-1 text-xs font-semibold truncate">
                    {item.product.name}
                    {item.presentation.unitsPerSale > 1 && (
                      <span className="text-brand-green"> · {item.presentation.name}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateQty(item.presentation.id, item.quantity - 1)}>
                      <Minus className="h-2.5 w-2.5" />
                    </Button>
                    <span className="w-6 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateQty(item.presentation.id, item.quantity + 1)}>
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <p className="text-xs font-bold w-16 text-right tabular-nums">
                    Bs {(Number(item.presentation.price) * item.quantity).toFixed(2)}
                  </p>
                  <button className="text-muted-foreground/40 hover:text-destructive" onClick={() => updateQty(item.presentation.id, 0)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Resumen */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Tiempo de mesa</span>
            <span className="tabular-nums">Bs {tableAmount.toFixed(2)}</span>
          </div>
          {itemsTotal > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Consumo</span>
              <span className="tabular-nums">Bs {itemsTotal.toFixed(2)}</span>
            </div>
          )}
          {prepaid > 0 && (
            <div className="flex justify-between text-brand-green text-xs font-semibold">
              <span>Anticipo de reserva</span>
              <span className="tabular-nums">- Bs {Math.min(prepaid, gross).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-bold">Total a cobrar</span>
            <span className="text-2xl font-black text-brand-deep tabular-nums">Bs {totalDue.toFixed(2)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="rounded-xl text-muted-foreground"
            disabled={freeWithoutCharge.isPending}
            onClick={() => {
              if (window.confirm('¿Liberar la mesa sin registrar cobro? El tiempo jugado se perderá.')) {
                freeWithoutCharge.mutate();
              }
            }}
          >
            {freeWithoutCharge.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Liberar sin cobrar
          </Button>
          <Button
            className="flex-1 rounded-xl bg-brand-deep hover:bg-brand-green font-bold h-10"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <HandCoins className="h-4 w-4 mr-2" />}
            Cobrar Bs {totalDue.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════ CHECK-IN DE RESERVA ════════════════════
export function ReservedTableDialog({ table, branchId, onClose }: {
  table: TableData | null;
  branchId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['table-session', table?.id],
    queryFn: async () => { const { data } = await api.get(`/tables/${table!.id}/session`); return data; },
    enabled: !!table,
  });

  const checkIn = useMutation({
    mutationFn: (reservationId: string) => api.post(`/reservations/${reservationId}/check-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] });
      toast({ title: 'Check-in exitoso — cronómetro iniciado' });
      onClose();
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'No se pudo hacer check-in', variant: 'destructive' }),
  });

  const release = useMutation({
    mutationFn: () => api.patch(`/tables/${table!.id}/status`, { status: 'LIBRE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] });
      toast({ title: 'Mesa liberada' });
      onClose();
    },
    onError: () => toast({ title: 'No se pudo liberar', variant: 'destructive' }),
  });

  const res = session?.reservation;
  const reservedFor = res ? new Date(res.reservedFor) : null;

  return (
    <Dialog open={!!table} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            {table?.label} — Reservada
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : res ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-amber-900">{res.user.name}</p>
                  {res.user.phone && <p className="text-xs text-amber-700">{res.user.phone}</p>}
                </div>
              </div>
              <div className="flex justify-between text-xs text-amber-800 pt-1 border-t border-amber-200/60">
                <span>
                  Llega: <strong>{reservedFor?.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</strong>
                  {' · '}
                  {reservedFor?.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                </span>
                <span>Anticipo: <strong>Bs {Number(res.depositAmount).toFixed(2)}</strong></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cuando el cliente llegue, haz check-in: la mesa pasa a <strong>Ocupada</strong> y el cronómetro empieza a correr.
              El anticipo se descontará automáticamente al cobrar.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-muted-foreground"
                disabled={release.isPending}
                onClick={() => {
                  if (window.confirm('¿Liberar la mesa? La reserva quedará sin mesa asignada visualmente.')) release.mutate();
                }}
              >
                Liberar mesa
              </Button>
              <Button
                className="flex-1 rounded-xl bg-brand-deep hover:bg-brand-green font-bold"
                disabled={checkIn.isPending}
                onClick={() => checkIn.mutate(res.id)}
              >
                {checkIn.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                Cliente llegó — Check-in
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No se encontró una reserva vinculada a esta mesa. Puedes liberarla.
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={release.isPending}
              onClick={() => release.mutate()}
            >
              {release.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Liberar mesa
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
