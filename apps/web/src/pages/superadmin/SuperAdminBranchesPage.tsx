import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Building2, Users, LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  depositAmount: number;
  chain: { id: string; name: string };
  _count: { tables: number; staff: number };
}

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  address: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  depositAmount: z.coerce.number().min(0).default(0),
});
type Form = z.infer<typeof schema>;

export function SuperAdminBranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches-all'],
    queryFn: async () => { const { data } = await api.get('/branches'); return data; },
  });

  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const create = useMutation({
    mutationFn: (dto: Form) => api.post('/branches', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-all'] }); setDialog(false); form.reset(); toast({ title: 'Sucursal creada' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al crear', variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Form }) => api.put(`/branches/${id}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-all'] }); setEditBranch(null); toast({ title: 'Sucursal actualizada' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al actualizar', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches-all'] }); setDeleteTarget(null); toast({ title: 'Sucursal eliminada' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al eliminar', variant: 'destructive' }),
  });

  function openCreate() { form.reset({ name: '', address: '', openTime: '', closeTime: '', depositAmount: 0 }); setDialog(true); }
  function openEdit(b: Branch) {
    form.reset({ name: b.name, address: b.address ?? '', openTime: b.openTime ?? '', closeTime: b.closeTime ?? '', depositAmount: b.depositAmount });
    setEditBranch(b);
  }

  const isOpen = dialog || !!editBranch;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sucursales</h1>
          <p className="text-sm text-slate-400 mt-1">{branches.length} sucursal{branches.length !== 1 ? 'es' : ''} registrada{branches.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Nueva sucursal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-slate-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Sin sucursales. Crea la primera.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-1 w-full bg-brand-green/70" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-brand-deep" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                      {b.address && <p className="text-xs text-slate-500 truncate mt-0.5">{b.address}</p>}
                      {(b.openTime || b.closeTime) && (
                        <p className="text-xs text-slate-400 mt-0.5">{b.openTime ?? '?'} – {b.closeTime ?? '?'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5"><LayoutGrid className="h-3 w-3 text-slate-400" />{b._count.tables} mesas</span>
                  <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-slate-400" />{b._count.staff} personal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { setDialog(false); setEditBranch(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBranch ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((dto) => editBranch ? update.mutate({ id: editBranch.id, dto }) : create.mutate(dto))} className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Billarmania Centro" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label>Dirección</Label>
              <Input placeholder="Av. Arce 1234, La Paz" {...form.register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Apertura</Label>
                <Input type="time" {...form.register('openTime')} />
              </div>
              <div>
                <Label>Cierre</Label>
                <Input type="time" {...form.register('closeTime')} />
              </div>
            </div>
            <div>
              <Label>Depósito reserva (Bs)</Label>
              <Input type="number" min={0} placeholder="0" {...form.register('depositAmount')} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setDialog(false); setEditBranch(null); }}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editBranch ? 'Guardar' : 'Crear sucursal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar sucursal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer. Se eliminarán también las mesas y datos asociados.
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
