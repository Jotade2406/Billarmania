import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Percent, Trash2, Loader2, Upload, X, Power, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { toInputDate } from '@/features/cajero/VentasPage';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  unit: string;
  presentations: { id: string; name: string; unitsPerSale: number; price: number; available: boolean }[];
}

interface Promo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  originalPrice: number;
  promoPrice: number;
  savings: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  maxUses: number | null;
  currentUses: number;
  status: 'activa' | 'programada' | 'vencida' | 'agotada' | 'inactiva';
  presentation: {
    id: string;
    name: string;
    unitsPerSale: number;
    product: { name: string };
  };
}

const STATUS_META: Record<Promo['status'], { label: string; cls: string }> = {
  activa:     { label: 'Activa',     cls: 'bg-brand-green/10 text-brand-deep' },
  programada: { label: 'Programada', cls: 'bg-blue-50 text-blue-600' },
  vencida:    { label: 'Vencida',    cls: 'bg-slate-100 text-slate-500' },
  agotada:    { label: 'Agotada',    cls: 'bg-red-50 text-red-500' },
  inactiva:   { label: 'Pausada',    cls: 'bg-amber-50 text-amber-600' },
};

const schema = z.object({
  presentationId: z.string().min(1, 'Selecciona un producto'),
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  promoPrice: z.coerce.number().min(0.01, 'Requerido'),
  validFrom: z.string().min(1, 'Requerido'),
  validUntil: z.string().min(1, 'Requerido'),
  maxUses: z.coerce.number().int().min(1).optional().or(z.literal('')),
});
type Form = z.infer<typeof schema>;

export function DuenoPromosPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialog, setDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promo | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const { data: promos = [], isLoading } = useQuery<Promo[]>({
    queryKey: ['promos-manage', branchId],
    queryFn: async () => { const { data } = await api.get(`/promotions/manage/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', branchId],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const save = useMutation({
    mutationFn: (dto: any) => api.post(`/promotions/branch/${branchId}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promos-manage', branchId] });
      closeDialog();
      toast({ title: 'Promoción creada' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al crear', variant: 'destructive' }),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/promotions/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promos-manage', branchId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promos-manage', branchId] });
      setDeleteTarget(null);
      toast({ title: 'Promoción eliminada' });
    },
  });

  // Opciones del selector: producto · presentación
  const presOptions = useMemo(() =>
    products.flatMap((p) =>
      (p.presentations ?? []).map((pres) => ({
        id: pres.id,
        label: pres.unitsPerSale > 1 ? `${p.name} · ${pres.name}` : p.name,
        price: Number(pres.price),
      })),
    ), [products]);

  const selectedPres = presOptions.find((o) => o.id === form.watch('presentationId'));
  const promoPrice = Number(form.watch('promoPrice')) || 0;
  const savings = selectedPres && promoPrice > 0 ? selectedPres.price - promoPrice : 0;

  function openCreate() {
    const today = toInputDate(new Date());
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    form.reset({ presentationId: '', title: '', description: '', promoPrice: 0, validFrom: today, validUntil: toInputDate(nextWeek), maxUses: '' });
    setImage(null);
    setDialog(true);
  }

  function closeDialog() {
    setDialog(false);
    setImage(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setImage(await compressImage(file, 900)); }
    catch (err: any) { toast({ title: err.message, variant: 'destructive' }); }
  }

  function submit(dto: Form) {
    save.mutate({
      presentationId: dto.presentationId,
      title: dto.title,
      description: dto.description || undefined,
      imageUrl: image ?? undefined,
      promoPrice: Number(dto.promoPrice),
      validFrom: new Date(dto.validFrom).toISOString(),
      validUntil: new Date(dto.validUntil + 'T23:59:59').toISOString(),
      maxUses: dto.maxUses ? Number(dto.maxUses) : undefined,
    });
  }

  const activeCount = promos.filter((p) => p.status === 'activa' || p.status === 'programada').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promociones</h1>
          <p className="text-sm text-slate-400 mt-1">{activeCount}/5 promociones activas — descuentos reales sobre tus productos</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Nueva promoción
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-[150px] rounded-2xl border border-slate-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
          <Percent className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin promociones</p>
          <p className="text-xs mt-1">Crea descuentos sobre tus paquetes para atraer clientes desde la app.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {promos.map((p) => {
            const meta = STATUS_META[p.status];
            const usePct = p.maxUses ? Math.min(100, (p.currentUses / p.maxUses) * 100) : null;
            return (
              <div key={p.id} className={cn(
                'bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow',
                (p.status === 'vencida' || p.status === 'inactiva') && 'opacity-70',
              )}>
                <div className="flex">
                  {p.imageUrl && (
                    <div className="w-28 flex-shrink-0 bg-slate-100">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{p.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {p.presentation.product.name}
                          {p.presentation.unitsPerSale > 1 && ` · ${p.presentation.name}`}
                        </p>
                      </div>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', meta.cls)}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xs text-slate-400 line-through tabular-nums">Bs {Number(p.originalPrice).toFixed(2)}</span>
                      <span className="text-lg font-black text-brand-green tabular-nums">Bs {Number(p.promoPrice).toFixed(2)}</span>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                        Ahorra Bs {p.savings.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {new Date(p.validFrom).toLocaleDateString('es-BO')} → {new Date(p.validUntil).toLocaleDateString('es-BO')}
                    </p>

                    {usePct !== null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Usos</span>
                          <span className="tabular-nums">{p.currentUses}/{p.maxUses}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${usePct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-3">
                      <Button
                        size="sm" variant="outline"
                        className={cn('flex-1 text-xs h-7', p.isActive ? 'text-amber-600' : 'text-brand-green')}
                        onClick={() => toggle.mutate(p.id)}
                      >
                        <Power className="h-3 w-3 mr-1" />{p.isActive ? 'Pausar' : 'Activar'}
                      </Button>
                      <Button size="sm" variant="outline" className="px-2 h-7 text-red-500" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Crear promoción */}
      <Dialog open={dialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-green" />
              Nueva promoción
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <div>
              <Label>Producto / paquete a promocionar *</Label>
              <Select value={form.watch('presentationId') ?? ''} onValueChange={(v) => form.setValue('presentationId', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {presOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label} — Bs {o.price.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.presentationId && <p className="text-xs text-destructive mt-1">{form.formState.errors.presentationId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio original</Label>
                <Input disabled value={selectedPres ? `Bs ${selectedPres.price.toFixed(2)}` : '—'} className="bg-slate-50" />
              </div>
              <div>
                <Label>Precio promo (Bs) *</Label>
                <Input type="number" step="0.01" {...form.register('promoPrice')} />
                {form.formState.errors.promoPrice && <p className="text-xs text-destructive mt-1">{form.formState.errors.promoPrice.message}</p>}
              </div>
            </div>

            {/* Ahorro en vivo */}
            {selectedPres && promoPrice > 0 && (
              <div className={cn(
                'rounded-xl p-3 text-xs border',
                savings > 0
                  ? 'bg-brand-green/5 border-brand-green/20 text-brand-deep'
                  : 'bg-red-50 border-red-200 text-red-600',
              )}>
                {savings > 0
                  ? <>El cliente ahorra <strong>Bs {savings.toFixed(2)}</strong> ({Math.round((savings / selectedPres.price) * 100)}% de descuento)</>
                  : 'El precio promo debe ser menor al original'}
              </div>
            )}

            <div>
              <Label>Título *</Label>
              <Input placeholder="Ej: Media docena a precio loco" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Opcional" {...form.register('description')} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Desde *</Label>
                <Input type="date" {...form.register('validFrom')} />
              </div>
              <div>
                <Label>Hasta *</Label>
                <Input type="date" {...form.register('validUntil')} />
              </div>
              <div>
                <Label>Límite usos</Label>
                <Input type="number" min={1} placeholder="∞" {...form.register('maxUses')} />
              </div>
            </div>

            {/* Imagen opcional */}
            <div className="space-y-1.5">
              <Label>Imagen <span className="text-slate-400 font-normal">(opcional)</span></Label>
              {image ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                  <img src={image} alt="promo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-green/50 text-slate-400 text-xs font-medium"
                >
                  <Upload className="h-4 w-4" />Subir imagen
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending || savings <= 0}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear promoción
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar promoción</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">¿Eliminar <strong>{deleteTarget?.title}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              {remove.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
