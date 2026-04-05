import { Badge } from '@/components/ui/Badge';
import type { RequestStatus } from '@/types';

const statusConfig: Record<
  RequestStatus,
  { label: string; variant: 'amber' | 'blue' | 'forest' | 'purple' | 'green' | 'red' | 'gray'; dot?: boolean }
> = {
  PENDING: { label: 'Pendiente', variant: 'amber', dot: true },
  NOTIFIED: { label: 'Notificado', variant: 'blue' },
  ACCEPTED: { label: 'Aceptada', variant: 'forest' },
  IN_PROGRESS: { label: 'En curso', variant: 'purple', dot: true },
  COMPLETED: { label: 'Completada', variant: 'green' },
  CANCELLED: { label: 'Cancelada', variant: 'red' },
  EXPIRED: { label: 'Expirada', variant: 'gray' },
  NO_SHOW: { label: 'No-show', variant: 'red' },
  INTERRUPTED: { label: 'Interrumpida', variant: 'amber' },
};

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
