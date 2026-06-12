import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Users, LogOut, Menu, X, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/superadmin',       label: 'Sucursales', icon: Building2, end: true },
  { to: '/superadmin/users', label: 'Usuarios',   icon: Users },
];

export function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() { logout(); navigate('/login'); }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  const sidebar = (
    <nav className="flex flex-col h-full bg-slate-900">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-deep flex items-center justify-center shadow-md flex-shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-sm tracking-tight">Billarmania</p>
            <p className="text-[11px] text-slate-500 font-medium">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isActive
                ? 'bg-brand-deep text-white shadow-md shadow-black/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />{label}
          </NavLink>
        ))}
      </div>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 mb-2">
          <div className="w-8 h-8 rounded-lg bg-brand-deep flex items-center justify-center text-white text-xs font-black flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-500 hover:text-red-400 hover:bg-slate-800 h-9"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />Cerrar sesión
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 fixed inset-y-0 left-0 z-20">{sidebar}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-56 flex flex-col md:hidden transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="absolute right-3 top-3 z-50">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)} className="text-slate-600">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-deep flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Billarmania Admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
