import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, LayoutGrid, ClipboardList, ChevronDown, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableGrid } from '@/features/operativo/TableGrid';
import { ReservationQueue } from '@/features/operativo/ReservationQueue';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

type Tab = 'mesas' | 'reservas';

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

export function DashboardPage() {
  const [tab, setTab] = useState<Tab>('mesas');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const isCajero = user?.role === 'CAJERO';
  const preselectedBranch = user?.staffBranchId ?? null;
  const [selectedBranch, setSelectedBranch] = useState<string | null>(preselectedBranch);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches-all'],
    queryFn: async () => {
      if (isCajero && preselectedBranch) return [];
      const { data: chains } = await api.get('/chains');
      const all: Branch[] = [];
      for (const chain of chains) {
        const { data: bs } = await api.get(`/chains/${chain.id}/branches`);
        all.push(...bs);
      }
      return all;
    },
    enabled: !isCajero || !preselectedBranch,
  });

  const { data: branchDetail } = useQuery<{ name: string; address: string | null }>({
    queryKey: ['branch-detail', selectedBranch],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${selectedBranch}`);
      return data;
    },
    enabled: !!selectedBranch,
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-slate-900 hidden sm:block">Billarmania</span>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* Branch selector */}
          {isCajero && preselectedBranch ? (
            <span className="text-sm text-slate-600 flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {branchDetail?.name ?? 'Cargando...'}
            </span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-slate-700">
                  <Building2 className="h-4 w-4" />
                  {branchDetail?.name ?? 'Seleccionar sucursal'}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {branches?.length ? (
                  branches.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onSelect={() => setSelectedBranch(b.id)}
                      className="cursor-pointer"
                    >
                      {b.name}
                      {b.address && (
                        <span className="ml-2 text-xs text-slate-400">{b.address}</span>
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Sin sucursales disponibles</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:block">{user?.name}</span>
          <Badge variant="secondary" className="text-xs hidden sm:flex">
            {user?.role}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600">
            <LogOut className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:block">Salir</span>
          </Button>
        </div>
      </header>

      {!selectedBranch ? (
        /* No branch selected */
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
          <Building2 className="h-12 w-12 opacity-40" />
          <p className="font-medium">Selecciona una sucursal para continuar</p>
          <p className="text-sm">Usa el selector en la barra superior</p>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {/* Tab bar */}
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setTab('mesas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'mesas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Mesas
            </button>
            <button
              onClick={() => setTab('reservas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'reservas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Reservas pendientes
            </button>
          </div>

          {/* Tab content */}
          {tab === 'mesas' ? (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Estado de mesas</h2>
                <p className="text-sm text-slate-500">
                  Clic en una mesa libre para ocuparla, o en una ocupada para liberarla.
                  Se actualiza en tiempo real.
                </p>
              </div>
              <TableGrid branchId={selectedBranch} />
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Comprobantes para revisar
                </h2>
                <p className="text-sm text-slate-500">
                  Clientes que subieron su comprobante de pago. Tienes 10 minutos para
                  confirmar o rechazar cada uno.
                </p>
              </div>
              <div className="max-w-lg">
                <ReservationQueue branchId={selectedBranch} />
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
