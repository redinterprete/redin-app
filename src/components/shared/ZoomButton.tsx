'use client';

import { Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoomButtonProps {
  joinUrl: string | null | undefined;
  password?: string | null;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function ZoomButton({ joinUrl, password, size = 'lg', fullWidth, className }: ZoomButtonProps) {
  if (!joinUrl) return null;

  return (
    <div className={cn('space-y-1', fullWidth && 'w-full', className)}>
      <a
        href={joinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
          'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 shadow-sm',
          size === 'lg' ? 'px-6 py-3 text-base min-h-[48px]' : 'px-4 py-2 text-sm',
          fullWidth && 'w-full'
        )}
      >
        <Video className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
        Unirse a Zoom
      </a>
      {password && (
        <p className="text-xs text-redin-earth-500 text-center">
          Contrasena: <span className="font-mono font-medium">{password}</span>
        </p>
      )}
    </div>
  );
}
