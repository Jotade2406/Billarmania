import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, LayoutGrid, ClipboardList, ChevronDown, Building2, ShoppingBag, Package, Receipt, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableGrid } from '@/features/operativo/TableGrid';
import { ReservationQueue } from '@/features/operativo/ReservationQueue';
import { VentasPage } from '@/features/cajero/VentasPage';
import { InventarioPage } from '@/features/cajero/InventarioPage';
import { FacturasCajeroPage } from '@/features/cajero/FacturasCajeroPage';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'mesas' | 'reservas' | 'ventas' | 'inventario' | 'facturas';

interface Branch { id: string; name: string; address: string | null; }

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'mesas',      label: 'Mesas',      icon: LayoutGrid },
  { id: 'reservas',   label: 'Reservas',   icon: ClipboardList },
  { id: 'ventas',     label: 'Ventas',     icon: ShoppingBag },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'facturas',   label: 'Facturas',   icon: Receipt },
];

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
    queryFn: async () => { const { data } = await api.get(`/branches/${selectedBranch}`); return data; },
    enabled: !!selectedBranch,
  });

  function handleLogout() { logout(); navigate('/login'); }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Topbar (marca: ink + verde) ─────────────────────────── */}
      <header className="bg-brand-ink px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-green flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(29,158,117,0.35)]">
            <span className="text-brand-ink text-sm font-black">B</span>
          </div>
          <span className="font-bold text-brand-cream hidden sm:block text-sm tracking-tight">Billarmania</span>
          <div className="h-5 w-px bg-white/10 hidden sm:block mx-1" />

          {isCajero && preselectedBranch ? (
            <div className="flex items-center gap-2 text-sm text-neutral-300 font-medium">
              <Building2 className="h-4 w-4 text-brand-green" />
              {branchDetail?.name ?? '...'}
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-neutral-300 font-medium h-8 px-3 hover:bg-white/5 hover:text-white">
                  <Building2 className="h-3.5 w-3.5 text-brand-green" />
                  <span className="max-w-[180px] truncate">{branchDetail?.name ?? 'Seleccionar sucursal'}</span>
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {branches?.length ? branches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onSelect={() => setSelectedBranch(b.id)}
                    className={cn('cursor-pointer', selectedBranch === b.id && 'bg-muted font-medium')}
                  >
                    <div>
                      <p className="text-sm">{b.name}</p>
                      {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                    </div>
                  </DropdownMenuItem>
                )) : (
                  <DropdownMenuItem disabled>Sin sucursales</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <div className="w-7 h-7 rounded-lg bg-brand-deep flex items-center justify-center text-xs font-bold text-brand-mint">{initial}</div>
            <span className="text-sm text-neutral-200 font-medium">{user?.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-brand-green/15 text-brand-mint">{user?.role}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-400 hover:text-red-400 hover:bg-white/5 h-8 w-8 p-0 sm:w-auto sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:block text-xs">Salir</span>
          </Button>
        </div>
      </header>

      {!selectedBranch ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center">
            <Building2 className="h-7 w-7 opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Selecciona una sucursal</p>
            <p className="text-sm mt-1">Usa el selector en la barra superior</p>
          </div>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-muted-foreground font-medium">{branchDetail?.name ?? '...'}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-xs font-semibold text-foreground">{activeTab.label}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                  tab === id
                    ? 'bg-brand-deep text-brand-cream shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div>
            {tab === 'mesas' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-foreground">Estado de mesas</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Toca una mesa libre para ocuparla, una ocupada para liberarla.</p>
                </div>
                <TableGrid branchId={selectedBranch} />
              </div>
            )}
            {tab === 'reservas' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-foreground">Cola de comprobantes</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Clientes que subieron su comprobante. Tienes 10 min para confirmar o rechazar.</p>
                </div>
                <div className="max-w-xl"><ReservationQueue branchId={selectedBranch} /></div>
              </div>
            )}
            {tab === 'ventas'     && <VentasPage branchId={selectedBranch} />}
            {tab === 'inventario' && <InventarioPage branchId={selectedBranch} />}
            {tab === 'facturas'   && <FacturasCajeroPage branchId={selectedBranch} />}
          </div>
        </main>
      )}
    </div>
  );
}
