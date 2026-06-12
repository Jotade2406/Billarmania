import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const { data: auth } = await api.post<{ access_token: string }>('/auth/login', data);
      const { data: me } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${auth.access_token}` } });
      login(auth.access_token, me);
      const dest = me.role === 'CAJERO' ? '/dashboard' : me.role === 'DUENO' ? '/dueno' : '/superadmin';
      navigate(dest);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(msg ?? 'Credenciales incorrectas. Verifica tu email y contraseña.');
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0f1e]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-slate-900 p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/30">
            <span className="text-slate-900 text-base font-black">B</span>
          </div>
          <span className="font-black text-white text-lg tracking-tight">Billarmania</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            {[
              { dot: 'bg-brand-green', text: 'Control de mesas en tiempo real' },
              { dot: 'bg-amber-400',   text: 'Gestión de reservas y pagos QR' },
              { dot: 'bg-blue-400',    text: 'POS, inventario y facturación' },
            ].map(({ dot, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
                <p className="text-sm text-slate-300 font-medium">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 font-medium">Panel de operaciones · Staff exclusivo</p>
        </div>

        <div className="text-xs text-slate-700">Billarmania © {new Date().getFullYear()}</div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center">
              <span className="text-slate-900 text-base font-black">B</span>
            </div>
            <span className="font-black text-white text-lg">Billarmania</span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Iniciar sesión</h1>
            <p className="text-slate-400 mt-2 text-sm">Acceso para cajeros y administradores</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="cajero@billar.bo"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-brand-green focus:ring-brand-green/20 rounded-xl"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-brand-green focus:ring-brand-green/20 rounded-xl"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-xl bg-red-950 border border-red-800/50 px-4 py-3">
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-brand-green hover:bg-brand-mint text-slate-900 font-bold text-sm rounded-xl shadow-lg shadow-brand-green/20 transition-all mt-2"
            >
              {isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ingresando...</>
                : <><span>Ingresar</span><ArrowRight className="ml-2 h-4 w-4" /></>
              }
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600">
            ¿Problemas para ingresar? Contacta al administrador
          </p>
        </div>
      </div>
    </div>
  );
}
