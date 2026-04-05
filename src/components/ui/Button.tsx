import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary:
    'bg-redin-gold-400 text-white hover:bg-redin-gold-500 focus:ring-redin-gold-300',
  secondary:
    'bg-redin-forest-600 text-white hover:bg-redin-forest-700 focus:ring-redin-forest-300',
  outline:
    'border border-redin-earth-300 text-redin-earth-700 hover:bg-redin-earth-50 focus:ring-redin-earth-200',
  ghost:
    'text-redin-earth-600 hover:bg-redin-earth-100 focus:ring-redin-earth-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
