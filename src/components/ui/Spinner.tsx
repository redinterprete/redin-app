import { cn } from '@/lib/utils';

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' } as const;

interface SpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
  overlay?: boolean;
}

export function Spinner({ size = 'md', className, overlay }: SpinnerProps) {
  const spinner = (
    <svg
      className={cn('animate-spin text-redin-gold-400', sizes[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl">
        {spinner}
      </div>
    );
  }

  return spinner;
}
