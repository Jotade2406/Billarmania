import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Minus, Receipt, Loader2, Search,
  ChevronDown, ShoppingBag, User, Wallet, X, ArrowLeft, Banknote,
  QrCode, CreditCard, Landmark, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ReceiptDialog, type ReceiptData } from './ReceiptDialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface Presentation {
  id: string;
  name: string;
  description: string | null;
  unitsPerSale: number;
  price: number;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string | null;
  presentations: Presentation[];
}

interface SaleItem {
  product: Product;
  presentation: Presentation;
  quantity: number;
}

interface Sale {
  id: string;
  total: number;
  customerName: string | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  cashier: { name: string };
  items: {
    quantity: number;
    unitPrice: number;
    product: { name: string };
    presentation?: { name: string; unitsPerSale: number } | null;
  }[];
  invoice?: { invoiceNumber: string; status: string };
}

/** "2x Cerveza (Media docena)" — etiqueta de un item vendido */
export function saleItemLabel(i: Sale['items'][number]) {
  const pack = i.presentation && i.presentation.unitsPerSale > 1 ? ` (${i.presentation.name})` : '';
  return `${i.quantity}x ${i.product.name}${pack}`;
}


const PAYMENT_METHODS = [
  { id: 'EFECTIVO',      label: 'Efectivo',       icon: Banknote },
  { id: 'QR',            label: 'QR Bancario',    icon: QrCode },
  { id: 'TARJETA',       label: 'Tarjeta',        icon: CreditCard },
  { id: 'TRANSFERENCIA', label: 'Transferencia',  icon: Landmark },
];

export function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseInputDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function VentasPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const todayStr = toInputDate(new Date());
  const [date, setDate] = useState(todayStr);

  // Combobox state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [pickerOpen]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', branchId],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${branchId}`); return data; },
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ['sales', branchId],
    queryFn: async () => { const { data } = await api.get(`/sales/branch/${branchId}`); return data; },
  });

  const createSale = useMutation({
    mutationFn: () => api.post(`/sales/branch/${branchId}`, {
      items: items.map((i) => ({ presentationId: i.presentation.id, quantity: i.quantity })),
      customerName: customerName.trim() || undefined,
      paymentMethod,
    }),
    onSuccess: (res) => {
      setReceipt({
        invoiceNumber: res.data.invoice.invoiceNumber,
        customerName: customerName.trim() || null,
        paymentMethod,
        items: res.data.sale.items.map((i: any) => ({
          label: saleItemLabel(i),
          amount: Number(i.subtotal ?? i.quantity * Number(i.unitPrice)),
        })),
        total: Number(res.data.sale.total),
      });
      resetForm();
      setMode('list');
      qc.invalidateQueries({ queryKey: ['products', branchId] });
      qc.invalidateQueries({ queryKey: ['sales', branchId] });
      qc.invalidateQueries({ queryKey: ['invoices', branchId] });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al procesar la venta', variant: 'destructive' }),
  });

  function resetForm() {
    setItems([]);
    setCustomerName('');
    setPaymentMethod('EFECTIVO');
    setPickerSearch('');
    setPickerOpen(false);
  }

  // Filas del selector: una por presentación (las agotadas se muestran deshabilitadas)
  const pickerRows = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return products
      .filter((p) =>
        !q || p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q),
      )
      .flatMap((p) => (p.presentations ?? []).map((pres) => ({ product: p, pres })));
  }, [products, pickerSearch]);

  /** Unidades ya comprometidas en el carrito para un producto. */
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
    if (qty <= 0) { setItems((prev) => prev.filter((i) => i.presentation.id !== presId)); return; }
    const item = items.find((i) => i.presentation.id === presId);
    if (!item) return;
    const used = deductedInCart(item.product.id, presId);
    if (used + qty * item.presentation.unitsPerSale > item.product.stock) {
      toast({ title: `Stock insuficiente para "${item.product.name}"`, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.map((i) => i.presentation.id === presId ? { ...i, quantity: qty } : i));
  }

  const total = items.reduce((acc, i) => acc + Number(i.presentation.price) * i.quantity, 0);
  const itemCount = items.reduce((a, i) => a + i.quantity, 0);

  // Ventas del día seleccionado
  const selectedDay = parseInputDate(date).toDateString();
  const isToday = date === todayStr;
  const daySales = sales.filter((s) => new Date(s.createdAt).toDateString() === selectedDay);
  const validSales = daySales.filter((s) => s.invoice?.status !== 'ANULADA');
  const revenue = validSales.reduce((acc, s) => acc + Number(s.total), 0);

  // Desglose por método de pago (para cuadrar caja)
  const byMethod = PAYMENT_METHODS.map((m) => ({
    ...m,
    amount: validSales.filter((s) => s.paymentMethod === m.id).reduce((a, s) => a + Number(s.total), 0),
  })).filter((m) => m.amount > 0);

  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }

  // ══════════════════ VISTA: REGISTRAR NUEVA VENTA ══════════════════
  if (mode === 'new') {
    return (
      <div className="max-w-2xl">
        {/* Header del formulario */}
        <button
          onClick={() => { resetForm(); setMode('list'); }}
          className="flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-deep transition-colors mb-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a ventas
        </button>

        {/* Sin overflow-hidden: el dropdown de productos debe poder salir del card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm">
          <div className="bg-brand-ink px-6 py-5 rounded-t-2xl">
            <h2 className="text-lg font-bold text-brand-cream">Registrar nueva venta</h2>
            <p className="text-xs text-brand-mint mt-0.5">Completa los datos y agrega los productos vendidos</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-brand-green" />
                Nombre del cliente
              </Label>
              <Input
                placeholder="Consumidor final"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">Opcional — déjalo vacío para consumidor final</p>
            </div>

            {/* Método de pago */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-brand-green" />
                Método de pago
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all',
                      paymentMethod === id
                        ? 'border-brand-green bg-brand-green/5 text-brand-deep'
                        : 'border-border bg-white text-muted-foreground hover:border-brand-green/40',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', paymentMethod === id ? 'text-brand-green' : 'text-muted-foreground/60')} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de productos (combobox con flechita) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-brand-green" />
                Productos vendidos
              </Label>

              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen(!pickerOpen)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 h-11 px-4 rounded-xl border bg-white text-sm transition-colors',
                    pickerOpen ? 'border-brand-green ring-2 ring-brand-green/15' : 'border-input hover:border-brand-green/50',
                  )}
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Search className="h-4 w-4" />
                    Buscar y agregar producto...
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', pickerOpen && 'rotate-180')} />
                </button>

                {pickerOpen && (
                  <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-border shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          autoFocus
                          placeholder="Escribe para filtrar..."
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-muted outline-none focus:ring-2 focus:ring-brand-green/20"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {pickerRows.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-6">Sin resultados</p>
                      ) : (
                        pickerRows.map(({ product: p, pres }) => {
                          const inCart = items.find((i) => i.presentation.id === pres.id)?.quantity ?? 0;
                          const remaining = p.stock - deductedInCart(p.id);
                          const agotado = !pres.available || remaining < pres.unitsPerSale;
                          return (
                            <button
                              key={pres.id}
                              type="button"
                              disabled={agotado}
                              onClick={() => addItem(p, pres)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                                agotado ? 'opacity-45 cursor-not-allowed' : 'hover:bg-brand-green/5',
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {p.name}
                                  {pres.unitsPerSale > 1 && <span className="text-brand-green font-bold"> · {pres.name}</span>}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {pres.unitsPerSale > 1
                                    ? `Descuenta ${pres.unitsPerSale} ${p.unit}${pres.description ? ` · ${pres.description}` : ''}`
                                    : `${p.category ? `${p.category} · ` : ''}${p.stock} ${p.unit} disponibles`}
                                </p>
                              </div>
                              {agotado ? (
                                <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                  AGOTADO
                                </span>
                              ) : inCart > 0 ? (
                                <span className="text-[10px] font-bold bg-brand-green/10 text-brand-deep px-1.5 py-0.5 rounded-full">
                                  ×{inCart}
                                </span>
                              ) : null}
                              <span className="text-sm font-bold text-brand-green tabular-nums">
                                Bs {Number(pres.price).toFixed(2)}
                              </span>
                              {!agotado && <Plus className="h-3.5 w-3.5 text-brand-green" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Items agregados */}
              {items.length > 0 && (
                <div className="mt-3 rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {items.map((item) => (
                    <div key={item.presentation.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.product.name}
                          {item.presentation.unitsPerSale > 1 && (
                            <span className="text-brand-green"> · {item.presentation.name}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          Bs {Number(item.presentation.price).toFixed(2)} c/u
                          {item.presentation.unitsPerSale > 1 && ` · descuenta ${item.quantity * item.presentation.unitsPerSale} ${item.product.unit}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.presentation.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.presentation.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold w-20 text-right tabular-nums">
                        Bs {(Number(item.presentation.price) * item.quantity).toFixed(2)}
                      </p>
                      <button
                        className="text-muted-foreground/40 hover:text-destructive transition-colors"
                        onClick={() => setItems((prev) => prev.filter((i) => i.presentation.id !== item.presentation.id))}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Total + acciones */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{itemCount} artículo{itemCount !== 1 ? 's' : ''}</p>
                <p className="text-3xl font-black text-brand-deep tabular-nums tracking-tight">Bs {total.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl h-11" onClick={() => { resetForm(); setMode('list'); }}>
                  Cancelar
                </Button>
                <Button
                  className="rounded-xl h-11 px-6 bg-brand-deep hover:bg-brand-green font-bold"
                  disabled={items.length === 0 || createSale.isPending}
                  onClick={() => createSale.mutate()}
                >
                  {createSale.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Receipt className="h-4 w-4 mr-2" />}
                  Cobrar y facturar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════ VISTA: LISTA DE VENTAS ══════════════════
  return (
    <div className="space-y-5">
      {/* Header + filtro de fecha + CTA */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isToday
              ? 'Ventas del día'
              : `Ventas — ${parseInputDate(date).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Registra ventas de productos y genera facturas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 h-11">
            <CalendarDays className="h-4 w-4 text-brand-green" />
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none text-foreground"
            />
          </div>
          {!isToday && (
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setDate(todayStr)}>
              Hoy
            </Button>
          )}
          <Button
            onClick={() => setMode('new')}
            className="rounded-xl h-11 px-5 bg-brand-deep hover:bg-brand-green font-bold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar nueva venta
          </Button>
        </div>
      </div>

      {/* KPIs + desglose por método de pago */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-2xl border border-border p-4 min-w-[130px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ventas</p>
          <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{validSales.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 min-w-[170px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total recaudado</p>
          <p className="text-2xl font-black text-brand-green mt-1 tabular-nums">Bs {revenue.toFixed(2)}</p>
        </div>
        {byMethod.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-4 flex-1 min-w-[240px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Desglose por pago</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {byMethod.map(({ id, label, icon: Icon, amount }) => (
                <div key={id} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-brand-green" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold tabular-nums">Bs {amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      {loadingSales ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[76px] rounded-2xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : daySales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border py-14 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
          <p className="font-semibold text-muted-foreground">
            {isToday ? 'Sin ventas registradas hoy' : 'Sin ventas en esta fecha'}
          </p>
          {isToday && <p className="text-xs text-muted-foreground/70 mt-1">Toca "Registrar nueva venta" para empezar</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {daySales.map((sale) => {
            const isVoided = sale.invoice?.status === 'ANULADA';
            const pm = PAYMENT_METHODS.find((m) => m.id === sale.paymentMethod);
            return (
              <div
                key={sale.id}
                className={cn(
                  'bg-white rounded-2xl border border-border p-4 flex items-center gap-4',
                  isVoided && 'opacity-50',
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  isVoided ? 'bg-muted' : 'bg-brand-green/10',
                )}>
                  <Receipt className={cn('h-4 w-4', isVoided ? 'text-muted-foreground' : 'text-brand-green')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {sale.invoice && <span className="font-bold text-sm">{sale.invoice.invoiceNumber}</span>}
                    <span className="text-xs text-muted-foreground">{fmtTime(sale.createdAt)}</span>
                    {isVoided && (
                      <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">ANULADA</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {sale.customerName ?? 'Consumidor final'}
                    {pm ? ` · ${pm.label}` : ''}
                    {' · '}
                    {sale.items.map(saleItemLabel).join(', ')}
                  </p>
                </div>
                <p className={cn(
                  'font-black tabular-nums text-base flex-shrink-0',
                  isVoided ? 'line-through text-muted-foreground' : 'text-brand-deep',
                )}>
                  Bs {Number(sale.total).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket imprimible */}
      <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
