import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, ClipboardList, Settings, LogOut, Menu, X, ShoppingBag, Receipt, Package, Crown, Megaphone, Percent } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dueno',           label: 'Resumen',        icon: LayoutDashboard, end: true },
  { to: '/dueno/mesas',     label: 'Mesas',           icon: LayoutGrid },
  { to: '/dueno/reservas',  label: 'Reservas',        icon: ClipboardList },
  { to: '/dueno/inventario',label: 'Inventario',      icon: Package },
  { to: '/dueno/ventas',    label: 'Ventas',          icon: ShoppingBag },
  { to: '/dueno/facturas',  label: 'Facturas',        icon: Receipt },
  { to: '/dueno/anuncios',  label: 'Anuncios',        icon: Megaphone },
  { to: '/dueno/promos',    label: 'Promociones',     icon: Percent },
  { to: '/dueno/config',    label: 'Configuración',   icon: Settings },
];

export function DuenoLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: branch } = useQuery<{ name: string }>({
    queryKey: ['branch', user?.staffBranchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${user!.staffBranchId}`); return data; },
    enabled: !!user?.staffBranchId,
  });

  function handleLogout() { logout(); navigate('/login'); }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  const sidebar = (
    <nav className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-ink flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-brand-mint text-sm font-black">B</span>
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm tracking-tight">Billarmania</p>
            {branch && <p className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">{branch.name}</p>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isActive
                ? 'bg-brand-deep text-brand-cream shadow-sm'
                : 'text-slate-500 hover:bg-brand-green/5 hover:text-brand-deep',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />{label}
          </NavLink>
        ))}
      </div>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Crown className="h-3 w-3 text-amber-500" />
              <p className="text-[11px] text-amber-600 font-semibold">Dueño</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-50 h-9"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />Cerrar sesión
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="hidden md:flex flex-col w-56 fixed inset-y-0 left-0 z-20">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-56 flex flex-col md:hidden transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="absolute right-3 top-3 z-50">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        {sidebar}
      </aside>

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-ink flex items-center justify-center">
              <span className="text-brand-mint text-xs font-black">B</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">Billarmania</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
