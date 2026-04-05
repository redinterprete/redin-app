'use client';

import { cn, formatTimer } from '@/lib/utils';

interface MeetingStatusProps {
  interpreterConnected: boolean;
  institutionConnected: boolean;
  billingSeconds: number;
  showBilling?: boolean;
}

export function MeetingStatus({
  interpreterConnected,
  institutionConnected,
  billingSeconds,
  showBilling = true,
}: MeetingStatusProps) {
  const bothConnected = interpreterConnected && institutionConnected;

  return (
    <div className="space-y-3">
      {/* Participant indicators */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
        <ParticipantDot label="Interprete" connected={interpreterConnected} />
        <ParticipantDot label="Institucion" connected={institutionConnected} />
      </div>

      {/* Billing timer */}
      {showBilling && billingSeconds > 0 && (
        <div className="text-center">
          <p
            className={cn(
              'text-3xl font-mono font-bold',
              bothConnected ? 'text-redin-gold-600' : 'text-redin-earth-400'
            )}
          >
            {formatTimer(billingSeconds)}
          </p>
          <p className="text-xs text-redin-earth-500 mt-1">
            {bothConnected ? 'Tiempo facturable' : 'Pausado — esperando reconexion'}
          </p>
        </div>
      )}
    </div>
  );
}

function ParticipantDot({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full shrink-0',
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'
        )}
      />
      <span className={cn('text-sm', connected ? 'text-green-700' : 'text-red-600')}>
        {label}: {connected ? 'Conectado' : 'Desconectado'}
      </span>
    </div>
  );
}
