'use client';

import { Check, Clock, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ServiceRequest } from '@/types';

interface Step {
  label: string;
  date?: string;
  detail?: string;
  done: boolean;
  active: boolean;
  cancelled?: boolean;
}

export function RequestTimeline({ request }: { request: ServiceRequest }) {
  const steps: Step[] = [
    {
      label: 'Creada',
      date: request.createdAt,
      done: true,
      active: false,
    },
    {
      label: 'Notificada',
      date: request.status !== 'PENDING' ? request.createdAt : undefined,
      done: ['NOTIFIED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED'].includes(request.status),
      active: request.status === 'NOTIFIED',
    },
    {
      label: 'Aceptada',
      date: request.acceptedAt,
      detail: request.interpreter?.user?.name,
      done: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED'].includes(request.status),
      active: request.status === 'ACCEPTED',
    },
    {
      label: 'En curso',
      date: request.startedAt,
      done: ['IN_PROGRESS', 'COMPLETED', 'INTERRUPTED'].includes(request.status),
      active: request.status === 'IN_PROGRESS',
    },
  ];

  if (request.status === 'CANCELLED') {
    steps.push({
      label: 'Cancelada',
      done: true,
      active: false,
      cancelled: true,
    });
  } else if (request.status === 'NO_SHOW') {
    steps.push({
      label: 'No-show',
      date: request.endedAt,
      done: true,
      active: false,
      cancelled: true,
    });
  } else if (request.status === 'INTERRUPTED') {
    steps.push({
      label: 'Interrumpida',
      date: request.endedAt,
      detail: request.durationMinutes ? `${request.durationMinutes} min` : undefined,
      done: true,
      active: false,
      cancelled: true,
    });
  } else {
    steps.push({
      label: 'Completada',
      date: request.endedAt,
      detail: request.durationMinutes ? `${request.durationMinutes} min` : undefined,
      done: request.status === 'COMPLETED',
      active: false,
    });
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-3">
          {/* Line + circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2',
                step.cancelled
                  ? 'bg-red-100 border-red-400 text-red-500'
                  : step.done
                    ? 'bg-redin-forest-100 border-redin-forest-500 text-redin-forest-600'
                    : step.active
                      ? 'bg-redin-gold-100 border-redin-gold-400 text-redin-gold-600 animate-pulse'
                      : 'bg-redin-earth-100 border-redin-earth-300 text-redin-earth-400'
              )}
            >
              {step.cancelled ? (
                <XCircle className="h-4 w-4" />
              ) : step.done ? (
                <Check className="h-4 w-4" />
              ) : step.active ? (
                <Clock className="h-4 w-4" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-redin-earth-300" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 flex-1 min-h-6',
                  step.done ? 'bg-redin-forest-300' : 'bg-redin-earth-200'
                )}
              />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 pt-0.5">
            <p
              className={cn(
                'text-sm font-medium',
                step.cancelled ? 'text-red-600' : step.done || step.active ? 'text-redin-earth-900' : 'text-redin-earth-400'
              )}
            >
              {step.label}
            </p>
            {step.date && (
              <p className="text-xs text-redin-earth-500">{formatDateTime(step.date)}</p>
            )}
            {step.detail && (
              <p className="text-xs text-redin-earth-500">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
