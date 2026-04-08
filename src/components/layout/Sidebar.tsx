'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Languages,
  FileText,
  CreditCard,
  Building2,
  LogOut,
  PlusCircle,
  History,
  Bell,
  Calendar,
  UserCircle,
  AudioWaveform,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/interpretes', label: 'Intérpretes', icon: Users },
  { href: '/admin/lenguas', label: 'Lenguas', icon: Languages },
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/admin/instituciones', label: 'Instituciones', icon: Building2 },
];

const institutionNav = [
  { href: '/institucion', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/institucion/nueva-solicitud', label: 'Nueva solicitud', icon: PlusCircle },
  { href: '/institucion/identificacion', label: 'Identificar lengua', icon: AudioWaveform },
  { href: '/institucion/historial', label: 'Historial', icon: History },
  { href: '/institucion/perfil', label: 'Mi perfil', icon: Building2 },
];

const interpreterNav = [
  { href: '/interprete', label: 'Solicitudes', icon: Bell },
  { href: '/interprete/agenda', label: 'Mi agenda', icon: Calendar },
  { href: '/interprete/historial', label: 'Historial', icon: History },
  { href: '/interprete/pagos', label: 'Mis pagos', icon: CreditCard },
  { href: '/interprete/perfil', label: 'Mi perfil', icon: UserCircle },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  INSTITUTION: 'Institución',
  INTERPRETER: 'Intérprete',
};

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { dbUser, signOut } = useAuth();

  const role = dbUser?.role ?? 'ADMIN';
  const navItems =
    role === 'INSTITUTION' ? institutionNav : role === 'INTERPRETER' ? interpreterNav : adminNav;
  const basePrefix = role === 'INSTITUTION' ? '/institucion' : role === 'INTERPRETER' ? '/interprete' : '/admin';

  const isActive = (href: string) =>
    href === basePrefix ? pathname === basePrefix : pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full bg-redin-forest-800 text-white w-64">
      {/* Logo */}
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold tracking-tight">REDIN</h1>
        <p className="text-xs text-redin-forest-400 mt-1">
          Plataforma de interpretación
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-redin-forest-700 text-white border-l-2 border-redin-gold-400'
                : 'text-redin-forest-200 hover:bg-redin-forest-700/50'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-redin-forest-700">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-redin-gold-400 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {dbUser?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{dbUser?.name}</p>
            <p className="text-xs text-redin-forest-400 truncate">
              {roleLabels[role] ?? role}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg hover:bg-redin-forest-700 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 text-redin-forest-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
