import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Megaphone, Trash2, Pencil, Loader2, Upload, X, Eye, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  views: number;
  createdAt: string;
}

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  position: z.coerce.number().int().min(0).default(0),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function DuenoAnunciosPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialog, setDialog] = useState<'create' | Ad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const { data: ads = [], isLoading } = useQuery<Ad[]>({
    queryKey: ['ads-manage', branchId],
    queryFn: async () => { const { data } = await api.get(`/advertisements/manage/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const save = useMutation({
    mutationFn: (payload: { id?: string; dto: any }) =>
      payload.id
        ? api.put(`/advertisements/${payload.id}`, payload.dto)
        : api.post(`/advertisements/branch/${branchId}`, payload.dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads-manage', branchId] });
      closeDialog();
      toast({ title: 'Anuncio guardado' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al guardar', variant: 'destructive' }),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/advertisements/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads-manage', branchId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/advertisements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads-manage', branchId] });
      setDeleteTarget(null);
      toast({ title: 'Anuncio eliminado' });
    },
  });

  function openCreate() {
    form.reset({ title: '', description: '', position: ads.length, startsAt: '', endsAt: '' });
    setImage(null);
    setDialog('create');
  }

  function openEdit(ad: Ad) {
    form.reset({
      title: ad.title,
      description: ad.description ?? '',
      position: ad.position,
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 10) : '',
      endsAt: ad.endsAt ? ad.endsAt.slice(0, 10) : '',
    });
    setImage(ad.imageUrl);
    setDialog(ad);
  }

  function closeDialog() {
    setDialog(null);
    setImage(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await compressImage(file, 900));
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
  }

  function submit(dto: Form) {
    if (!image) { toast({ title: 'Sube una imagen para el anuncio', variant: 'destructive' }); return; }
    save.mutate({
      id: dialog !== 'create' && dialog ? dialog.id : undefined,
      dto: {
        ...dto,
        imageUrl: image,
        startsAt: dto.startsAt ? new Date(dto.startsAt).toISOString() : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt + 'T23:59:59').toISOString() : undefined,
      },
    });
  }

  function vigencia(ad: Ad) {
    const now = new Date();
    if (ad.startsAt && new Date(ad.startsAt) > now) return { label: 'Programado', cls: 'bg-blue-50 text-blue-600' };
    if (ad.endsAt && new Date(ad.endsAt) < now) return { label: 'Vencido', cls: 'bg-slate-100 text-slate-500' };
    if (!ad.isActive) return { label: 'Pausado', cls: 'bg-amber-50 text-amber-600' };
    return { label: 'Visible', cls: 'bg-brand-green/10 text-brand-deep' };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Anuncios</h1>
          <p className="text-sm text-slate-400 mt-1">Publicidad de tu local en la app del cliente</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Nuevo anuncio
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[230px] rounded-2xl border border-slate-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin anuncios todavía</p>
          <p className="text-xs mt-1">Crea el primero — tus clientes lo verán en la app.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const v = vigencia(ad);
            return (
              <div key={ad.id} className={cn(
                'group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow',
                !ad.isActive && 'opacity-70',
              )}>
                <div className="aspect-video bg-slate-100 relative">
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                  <span className={cn('absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full', v.cls)}>
                    {v.label}
                  </span>
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-black/50 text-white px-2 py-0.5 rounded-full">
                    <Eye className="h-3 w-3" />{ad.views}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="font-bold text-slate-900 text-sm truncate">{ad.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ad.startsAt || ad.endsAt
                      ? `${ad.startsAt ? new Date(ad.startsAt).toLocaleDateString('es-BO') : '∞'} → ${ad.endsAt ? new Date(ad.endsAt).toLocaleDateString('es-BO') : '∞'}`
                      : 'Sin fecha límite'}
                    {' · '}orden {ad.position}
                  </p>
                  <div className="flex gap-1.5 mt-3">
                    <Button
                      size="sm" variant="outline"
                      className={cn('flex-1 text-xs h-8', ad.isActive ? 'text-amber-600' : 'text-brand-green')}
                      onClick={() => toggle.mutate(ad.id)}
                    >
                      <Power className="h-3 w-3 mr-1" />{ad.isActive ? 'Pausar' : 'Activar'}
                    </Button>
                    <Button size="sm" variant="outline" className="px-2 h-8" onClick={() => openEdit(ad)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="px-2 h-8 text-red-500" onClick={() => setDeleteTarget(ad)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Crear / editar */}
      <Dialog open={!!dialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand-green" />
              {dialog === 'create' ? 'Nuevo anuncio' : 'Editar anuncio'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            {/* Imagen + preview app */}
            <div className="space-y-1.5">
              <Label>Imagen del anuncio * <span className="text-slate-400 font-normal">(recomendado 16:9)</span></Label>
              {image ? (
                <div className="relative rounded-xl overflow-hidden border">
                  {/* Preview estilo app (dark) */}
                  <div className="bg-[#121212] p-3">
                    <div className="rounded-xl overflow-hidden aspect-video">
                      <img src={image} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center mt-1.5">Así se verá en la app del cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-green/50 hover:bg-brand-green/5 transition-colors text-slate-400"
                >
                  <Upload className="h-7 w-7" />
                  <span className="text-sm font-medium">Subir imagen</span>
                  <span className="text-xs">JPG, PNG · máx 2MB</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>

            <div>
              <Label>Título *</Label>
              <Input placeholder="Ej: 2x1 en Cerveza Paceña" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Opcional" {...form.register('description')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Inicio</Label>
                <Input type="date" {...form.register('startsAt')} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="date" {...form.register('endsAt')} />
              </div>
              <div>
                <Label>Orden</Label>
                <Input type="number" min={0} {...form.register('position')} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Sin fechas = visible siempre. El orden define la posición en el carrusel.</p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar anuncio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar anuncio</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">¿Eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.</p>
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
