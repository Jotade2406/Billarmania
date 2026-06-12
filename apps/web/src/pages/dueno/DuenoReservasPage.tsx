import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface Reservation {
  id: string;
  status: string;
  reservedFor: string;
  createdAt: string;
  user: { name: string; email: string };
  table: { label: string };
  payment: { status: string; amount: number | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente pago', EN_REVISION: 'En revisión', CONFIRMADA: 'Confirmada',
  ACTIVA: 'Activa', CANCELADA: 'Cancelada', COMPLETADA: 'Completada',
};

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE_PAGO: 'bg-slate-100 text-slate-700',
  EN_REVISION: 'bg-amber-100 text-amber-800',
  CONFIRMADA: 'bg-blue-100 text-blue-800',
  ACTIVA: 'bg-brand-green/10 text-brand-deep',
  CANCELADA: 'bg-red-100 text-red-800',
  COMPLETADA: 'bg-slate-100 text-slate-500',
};

export function DuenoReservasPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId!;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations-history', branchId, statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/branches/${branchId}/reservations/all${params}`);
      return data;
    },
    enabled: !!branchId,
  });

  const filtered = reservations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.user.name.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || r.table.label.toLowerCase().includes(q);
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reservas</h1>
        <p className="text-sm text-slate-500 mt-1">Historial de reservas de tu sucursal</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-3.5 w-3.5 mr-2 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar cliente o mesa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-slate-400">No hay reservas con ese filtro</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Mesa</TableHead>
                <TableHead>Fecha reserva</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Depósito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.user.name}</p>
                    <p className="text-xs text-slate-500">{r.user.email}</p>
                  </TableCell>
                  <TableCell className="font-medium">{r.table.label}</TableCell>
                  <TableCell className="text-sm text-slate-600">{formatDate(r.reservedFor)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.payment?.amount != null ? `Bs ${r.payment.amount}` : <span className="text-slate-400">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
