import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, ChevronRight, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Chain {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  depositAmount: number;
  _count?: { tables: number };
}

const chainSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres') });
const branchSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  address: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  depositAmount: z.coerce.number().min(0).optional(),
});

type ChainForm = z.infer<typeof chainSchema>;
type BranchForm = z.infer<typeof branchSchema>;

export function BranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [chainDialog, setChainDialog] = useState(false);
  const [branchDialog, setBranchDialog] = useState<string | null>(null); // chainId
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  const { data: chains = [], isLoading } = useQuery<Chain[]>({
    queryKey: ['chains-mine'],
    queryFn: async () => {
      const { data } = await api.get('/chains/mine');
      return data;
    },
  });

  const { data: branchesMap } = useQuery<Record<string, Branch[]>>({
    queryKey: ['all-branches', chains.map((c) => c.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        chains.map(async (c) => {
          const { data } = await api.get(`/chains/${c.id}/branches`);
          return [c.id, data] as [string, Branch[]];
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: chains.length > 0,
  });

  const createChain = useMutation({
    mutationFn: (dto: ChainForm) => api.post('/chains', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chains-mine'] });
      setChainDialog(false);
      toast({ title: 'Cadena creada' });
    },
    onError: () => toast({ title: 'Error al crear cadena', variant: 'destructive' }),
  });

  const createBranch = useMutation({
    mutationFn: ({ chainId, dto }: { chainId: string; dto: BranchForm }) =>
      api.post(`/chains/${chainId}/branches`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-branches'] });
      setBranchDialog(null);
      toast({ title: 'Sucursal creada' });
    },
    onError: () => toast({ title: 'Error al crear sucursal', variant: 'destructive' }),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: BranchForm }) => api.put(`/branches/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-branches'] });
      setEditBranch(null);
      toast({ title: 'Sucursal actualizada' });
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const deleteBranch = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-branches'] });
      toast({ title: 'Sucursal eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const chainForm = useForm<ChainForm>({ resolver: zodResolver(chainSchema) });
  const branchForm = useForm<BranchForm>({ resolver: zodResolver(branchSchema) });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sucursales</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona tus cadenas y sucursales</p>
        </div>
        <Button onClick={() => setChainDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva cadena
        </Button>
      </div>

      {chains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-slate-400">
            <Building2 className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">Sin cadenas registradas</p>
            <p className="text-sm">Crea tu primera cadena para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {chains.map((chain) => {
            const branches = branchesMap?.[chain.id] ?? [];
            return (
              <div key={chain.id}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {chain.name}
                    <Badge variant="secondary">{branches.length} sucursal{branches.length !== 1 ? 'es' : ''}</Badge>
                  </h2>
                  <Button size="sm" variant="outline" onClick={() => { branchForm.reset(); setBranchDialog(chain.id); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Sucursal
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branches.map((branch) => (
                    <Card key={branch.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{branch.name}</p>
                            {branch.address && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{branch.address}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {branch.openTime && (
                                <span className="text-xs text-slate-500">
                                  {branch.openTime} – {branch.closeTime}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                Depósito: Bs {branch.depositAmount}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => { branchForm.reset({ name: branch.name, address: branch.address ?? '', openTime: branch.openTime ?? '', closeTime: branch.closeTime ?? '', depositAmount: branch.depositAmount }); setEditBranch(branch); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => deleteBranch.mutate(branch.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Link
                          to={`/admin/branches/${branch.id}`}
                          className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          Ver mesas y métodos de pago
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: crear cadena */}
      <Dialog open={chainDialog} onOpenChange={setChainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cadena</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={chainForm.handleSubmit((dto) => createChain.mutate(dto))}
            className="space-y-4"
          >
            <div>
              <Label>Nombre</Label>
              <Input placeholder="Ej: Springfield Billiards" {...chainForm.register('name')} />
              {chainForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{chainForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setChainDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createChain.isPending}>
                {createChain.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear/editar sucursal */}
      <BranchFormDialog
        open={!!branchDialog || !!editBranch}
        title={editBranch ? 'Editar sucursal' : 'Nueva sucursal'}
        form={branchForm}
        isPending={createBranch.isPending || updateBranch.isPending}
        onClose={() => { setBranchDialog(null); setEditBranch(null); }}
        onSubmit={(dto) => {
          if (editBranch) updateBranch.mutate({ id: editBranch.id, dto });
          else createBranch.mutate({ chainId: branchDialog!, dto });
        }}
      />
    </div>
  );
}

function BranchFormDialog({
  open,
  title,
  form,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: ReturnType<typeof useForm<BranchForm>>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (dto: BranchForm) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input placeholder="Ej: Sucursal Centro" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label>Dirección</Label>
            <Input placeholder="Av. Montes 123" {...form.register('address')} />
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
            <Input type="number" min={0} placeholder="20" {...form.register('depositAmount')} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
