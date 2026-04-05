import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const variantClasses = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  forest: 'bg-redin-forest-100 text-redin-forest-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-redin-earth-100 text-redin-earth-600',
  gold: 'bg-redin-gold-100 text-redin-gold-800',
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
} as const;

interface BadgeProps {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'gray',
  size = 'md',
  dot,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full bg-current animate-pulse')}
        />
      )}
      {children}
    </span>
  );
}
