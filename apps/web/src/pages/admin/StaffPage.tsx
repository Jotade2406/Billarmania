import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Users, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  staffBranchId: string | null;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Chain {
  id: string;
}

const staffSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  staffBranchId: z.string().optional(),
});

type StaffForm = z.infer<typeof staffSchema>;

export function StaffPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);

  const { data: chains = [] } = useQuery<Chain[]>({
    queryKey: ['chains-mine'],
    queryFn: async () => {
      const { data } = await api.get('/chains/mine');
      return data;
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['all-branches-flat-staff', chains.map((c) => c.id).join(',')],
    queryFn: async () => {
      const all: Branch[] = [];
      for (const chain of chains) {
        const { data } = await api.get(`/chains/${chain.id}/branches`);
        all.push(...data);
      }
      return all;
    },
    enabled: chains.length > 0,
  });

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const { data } = await api.get('/branches/staff/all');
      return data;
    },
  });

  const form = useForm<StaffForm>({ resolver: zodResolver(staffSchema) });

  const createStaff = useMutation({
    mutationFn: (dto: StaffForm) =>
      api.post('/auth/staff', { ...dto, staffBranchId: dto.staffBranchId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-all'] });
      setDialog(false);
      form.reset();
      toast({ title: 'Cajero creado exitosamente' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? 'Error al crear cajero', variant: 'destructive' });
    },
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-all'] });
      toast({ title: 'Cajero eliminado' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  function getBranchName(id: string | null) {
    if (!id) return null;
    return branches.find((b) => b.id === id)?.name ?? id;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
          <p className="text-sm text-slate-500 mt-1">Cajeros asignados a tus sucursales</p>
        </div>
        <Button onClick={() => { form.reset(); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cajero
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-slate-400">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">Sin cajeros registrados</p>
            <p className="text-sm">Agrega un cajero para que pueda operar desde el panel</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.map((s) => {
            const branchName = getBranchName(s.staffBranchId);
            return (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500 truncate">{s.email}</p>
                      {branchName ? (
                        <Badge variant="secondary" className="text-xs mt-1.5">{branchName}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400 mt-1.5 block">Sin sucursal asignada</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 flex-shrink-0"
                    onClick={() => deleteStaff.mutate(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cajero</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((dto) => createStaff.mutate(dto))} className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input placeholder="Ej: María González" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="cajero@billar.bo" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label>Contraseña inicial</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" {...form.register('password')} />
              {form.formState.errors.password && <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>}
            </div>
            <div>
              <Label>Sucursal asignada</Label>
              <Select
                value={form.watch('staffBranchId') ?? ''}
                onValueChange={(v) => form.setValue('staffBranchId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={createStaff.isPending}>
                {createStaff.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear cajero
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
