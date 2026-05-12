import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

const variantClasses = {
  default: 'bg-white border border-redin-earth-200',
  elevated: 'bg-white shadow-md',
  highlighted: 'bg-white border border-redin-earth-200 border-l-4 border-l-redin-gold-400',
} as const;

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({
  variant = 'default',
  header,
  footer,
  children,
  className,
  ...props
}: CardProps) {
  // overflow-hidden solo cuando hay header/footer (para que los bordes redondeados
  // recorten correctamente esos bloques). Sin header/footer, dejamos overflow-visible
  // para que dropdowns/popovers internos puedan escapar de los limites de la Card.
  const needsClip = !!header || !!footer;
  return (
    <div
      className={cn(
        'rounded-xl',
        needsClip ? 'overflow-hidden' : 'overflow-visible',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-redin-earth-100">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-redin-earth-100 bg-redin-earth-50">
          {footer}
        </div>
      )}
    </div>
  );
}
