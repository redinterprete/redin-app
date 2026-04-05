'use client';

import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/interpretes': 'Intérpretes',
  '/admin/lenguas': 'Lenguas',
  '/admin/solicitudes': 'Solicitudes',
  '/admin/pagos': 'Pagos',
  '/admin/instituciones': 'Instituciones',
  '/institucion': 'Dashboard',
  '/institucion/nueva-solicitud': 'Nueva solicitud',
  '/institucion/historial': 'Historial',
  '/institucion/perfil': 'Mi perfil',
  '/interprete': 'Solicitudes',
  '/interprete/agenda': 'Mi agenda',
  '/interprete/historial': 'Historial',
  '/interprete/pagos': 'Mis pagos',
  '/interprete/perfil': 'Mi perfil',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { dbUser, signOut } = useAuth();

  const title = pageTitles[pathname] ?? 'REDIN';

  return (
    <header className="bg-white border-b border-redin-earth-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-redin-earth-100 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-redin-earth-600" />
        </button>
        <h2 className="text-lg font-semibold text-redin-earth-900">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionStatus />
        <NotificationBell />
        <span className="text-sm text-redin-earth-600 hidden sm:block">
          {dbUser?.name}
        </span>
        <Badge variant="gold" size="sm">
          {dbUser?.role === 'ADMIN' ? 'Admin' : dbUser?.role}
        </Badge>
        <button
          onClick={signOut}
          className="p-2 rounded-lg hover:bg-redin-earth-100 transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 text-redin-earth-500" />
        </button>
      </div>
    </header>
  );
}
