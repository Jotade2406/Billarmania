import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, User, Shield, Users, Crown, Briefcase, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Branch { id: string; name: string; }
interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DUENO' | 'CAJERO';
  avatarUrl?: string;
  staffBranch: { id: string; name: string } | null;
  createdAt: string;
}
interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['DUENO', 'CAJERO']),
  staffBranchId: z.string().min(1, 'Selecciona una sucursal'),
});
type Form = z.infer<typeof schema>;

type Tab = 'duenos' | 'cajeros' | 'clientes';

function Avatar({ url, name, size = 36 }: { url?: string; name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  if (url) return (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: 10, flexShrink: 0 }}
      className="bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
      {initial}
    </div>
  );
}

function UserCard({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow">
      <div className="flex-1 flex items-center gap-3 min-w-0">{children}</div>
      {onDelete && (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 flex-shrink-0" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function SuperAdminUsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('duenos');
  const [dialog, setDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);

  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffUser[]>({
    queryKey: ['staff-users'],
    queryFn: async () => { const { data } = await api.get('/branches/staff/all'); return data; },
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<ClientUser[]>({
    queryKey: ['client-users'],
    queryFn: async () => { const { data } = await api.get('/auth/clients'); return data; },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-all'],
    queryFn: async () => { const { data } = await api.get('/branches'); return data; },
  });

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CAJERO' },
  });

  const create = useMutation({
    mutationFn: (dto: Form) => api.post('/auth/staff', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-users'] });
      setDialog(false);
      form.reset({ role: 'CAJERO' });
      toast({ title: 'Usuario creado' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al crear usuario', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-users'] });
      qc.invalidateQueries({ queryKey: ['client-users'] });
      setDeleteTarget(null);
      toast({ title: 'Usuario eliminado' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al eliminar', variant: 'destructive' }),
  });

  const duenos = staff.filter(u => u.role === 'DUENO');
  const cajeros = staff.filter(u => u.role === 'CAJERO');
  const selectedRole = form.watch('role');

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'duenos', label: 'Dueños', icon: <Crown className="h-4 w-4" />, count: duenos.length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { key: 'cajeros', label: 'Cajeros', icon: <Briefcase className="h-4 w-4" />, count: cajeros.length, color: 'text-brand-green bg-brand-green/5 border-brand-green/25' },
    { key: 'clientes', label: 'Clientes', icon: <ShoppingBag className="h-4 w-4" />, count: clients.length, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  const isLoading = tab === 'clientes' ? loadingClients : loadingStaff;
  const currentList = tab === 'duenos' ? duenos : tab === 'cajeros' ? cajeros : clients;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de dueños, cajeros y clientes</p>
        </div>
        <Button onClick={() => { form.reset({ role: 'CAJERO' }); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nuevo usuario
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
              tab === t.key ? t.color : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50',
            )}
          >
            {t.icon}{t.label}
            <span className={cn('ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold', tab === t.key ? '' : 'bg-slate-100 text-slate-500')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : currentList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No hay {tabs.find(t => t.key === tab)?.label.toLowerCase()} registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tab === 'clientes'
            ? (clients as ClientUser[]).map(u => (
                <UserCard key={u.id} onDelete={() => setDeleteTarget(u)}>
                  <Avatar url={u.avatarUrl} name={u.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    {u.phone && <p className="text-xs text-slate-400 truncate">{u.phone}</p>}
                    <p className="text-xs text-slate-300 mt-0.5">{new Date(u.createdAt).toLocaleDateString('es-BO')}</p>
                  </div>
                </UserCard>
              ))
            : (currentList as StaffUser[]).map(u => (
                <UserCard key={u.id} onDelete={() => setDeleteTarget(u)}>
                  <Avatar url={u.avatarUrl} name={u.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    {u.phone && <p className="text-xs text-slate-400 truncate">{u.phone}</p>}
                    <p className="text-xs text-slate-400 truncate">
                      {u.staffBranch?.name ?? <span className="italic text-slate-300">Sin sucursal</span>}
                    </p>
                  </div>
                </UserCard>
              ))
          }
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialog} onOpenChange={(v) => { if (!v) setDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              Crear usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((dto) => create.mutate(dto))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre completo *</Label>
                <Input placeholder="Juan Pérez" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
              </div>
              <div className="col-span-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="juan@correo.com" {...form.register('email')} />
                {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label>Contraseña *</Label>
                <Input type="password" placeholder="mínimo 6 caracteres" {...form.register('password')} />
                {form.formState.errors.password && <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>}
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input placeholder="591 7xxxxxxx" {...form.register('phone')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rol *</Label>
                <Select value={selectedRole} onValueChange={(v) => form.setValue('role', v as 'DUENO' | 'CAJERO')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAJERO">Cajero</SelectItem>
                    <SelectItem value="DUENO">Dueño</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sucursal *</Label>
                <Select value={form.watch('staffBranchId') ?? ''} onValueChange={(v) => form.setValue('staffBranchId', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.staffBranchId && <p className="text-xs text-destructive mt-1">{form.formState.errors.staffBranchId.message}</p>}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              {selectedRole === 'CAJERO' && 'El cajero puede gestionar mesas y registrar pagos.'}
              {selectedRole === 'DUENO' && 'El dueño puede configurar la sucursal y ver reportes.'}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Eliminar a <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? Perderá acceso inmediatamente.
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
