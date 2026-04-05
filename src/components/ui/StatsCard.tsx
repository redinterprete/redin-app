import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor?: 'gold' | 'forest' | 'amber' | 'green' | 'red' | 'blue';
}

const accentBorder = {
  gold: 'border-l-redin-gold-400',
  forest: 'border-l-redin-forest-400',
  amber: 'border-l-amber-400',
  green: 'border-l-green-500',
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
} as const;

const accentIconBg = {
  gold: 'bg-redin-gold-50 text-redin-gold-500',
  forest: 'bg-redin-forest-50 text-redin-forest-500',
  amber: 'bg-amber-50 text-amber-500',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-500',
  blue: 'bg-blue-50 text-blue-500',
} as const;

export function StatsCard({
  title,
  value,
  icon: Icon,
  accentColor = 'gold',
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-redin-earth-200 border-l-4 p-6 flex items-start justify-between',
        accentBorder[accentColor]
      )}
    >
      <div>
        <p className="text-sm text-redin-earth-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-redin-earth-900">{value}</p>
      </div>
      <div
        className={cn('p-3 rounded-lg', accentIconBg[accentColor])}
      >
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-redin-earth-200 border-l-4 border-l-redin-earth-200 p-6 animate-pulse">
      <div className="h-4 w-24 bg-redin-earth-200 rounded" />
      <div className="mt-2 h-9 w-16 bg-redin-earth-200 rounded" />
    </div>
  );
}
