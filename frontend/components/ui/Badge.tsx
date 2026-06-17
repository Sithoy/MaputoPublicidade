import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'accent';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-brand/10 text-brand': variant === 'default',
          'border border-brand text-brand': variant === 'outline',
          'bg-accent/10 text-amber-700': variant === 'accent',
        },
        className
      )}
      {...props}
    />
  );
}
