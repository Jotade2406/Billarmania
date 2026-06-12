import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, LayoutGrid } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Table {
  id: string;
  label: string;
  status: string;
  hourlyRate: number | null;
}

const STATUS_META: Record<string, { label: string; strip: string; pill: string; dot: string }> = {
  LIBRE:             { label: 'Libre',             strip: 'bg-brand-green', pill: 'bg-brand-green/5 text-brand-deep', dot: 'bg-brand-green' },
  OCUPADA:           { label: 'Ocupada',           strip: 'bg-red-500',     pill: 'bg-red-50 text-red-600',         dot: 'bg-red-500' },
  RESERVADA:         { label: 'Reservada',         strip: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
  FUERA_DE_SERVICIO: { label: 'Fuera de servicio', strip: 'bg-slate-300',   pill: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-300' },
};

const schema = z.object({
  label: z.string().min(1, 'Requerido'),
  hourlyRate: z.coerce.number().min(0, 'Debe ser mayor o igual a 0').optional(),
});
type Form = z.infer<typeof schema>;

export function DuenoMesasPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId!;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null);

  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/tables`); return data; },
  });

  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const create = useMutation({
    mutationFn: (dto: Form) => api.post(`/tables/branch/${branchId}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); setDialog(false); toast({ title: 'Mesa creada' }); },
    onError: () => toast({ title: 'Error al crear mesa', variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Form }) => api.put(`/tables/${id}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); setEditTable(null); toast({ title: 'Mesa actualizada' }); },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); setDeleteTarget(null); toast({ title: 'Mesa eliminada' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al eliminar', variant: 'destructive' }),
  });

  const counts = tables.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mesas</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />{counts.LIBRE ?? 0} libres
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{counts.OCUPADA ?? 0} ocupadas
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{counts.RESERVADA ?? 0} reservadas
            </span>
          </div>
        </div>
        <Button onClick={() => { form.reset(); setDialog(true); }} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Nueva mesa
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[110px] rounded-2xl border border-slate-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
          <LayoutGrid className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin mesas registradas</p>
          <p className="text-xs mt-1">Crea la primera mesa de tu sucursal.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tables.map((t) => {
            const meta = STATUS_META[t.status] ?? STATUS_META.LIBRE;
            return (
              <div key={t.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className={cn('h-1 w-full', meta.strip)} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-base">{t.label}</p>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-1.5', meta.pill)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                        onClick={() => { form.reset({ label: t.label, hourlyRate: t.hourlyRate ?? undefined }); setEditTable(t); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 font-medium tabular-nums">
                    {t.hourlyRate != null ? `Bs ${t.hourlyRate}/hora` : 'Sin tarifa configurada'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialog || !!editTable} onOpenChange={(v) => { if (!v) { setDialog(false); setEditTable(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTable ? `Editar ${editTable.label}` : 'Nueva mesa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((dto) => editTable ? update.mutate({ id: editTable.id, dto }) : create.mutate(dto))} className="space-y-4">
            <div>
              <Label>Nombre / Número</Label>
              <Input placeholder="Ej: Mesa 1" {...form.register('label')} />
              {form.formState.errors.label && <p className="text-xs text-destructive mt-1">{form.formState.errors.label.message}</p>}
            </div>
            <div>
              <Label>Tarifa por hora (Bs)</Label>
              <Input type="number" min={0} step="0.50" placeholder="20" {...form.register('hourlyRate')} />
              <p className="text-xs text-slate-400 mt-1">Se usa para calcular el pago mínimo de 2 horas en reservas.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setDialog(false); setEditTable(null); }}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar mesa</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Eliminar <strong>{deleteTarget?.label}</strong>? Esta acción no se puede deshacer.
          </p>
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
