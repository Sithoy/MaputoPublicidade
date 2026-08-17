import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-brand text-white shadow-[0_10px_24px_-12px_rgba(8,114,71,0.75)] hover:-translate-y-0.5 hover:bg-brand-600': variant === 'primary',
            'bg-brand-800 text-white hover:-translate-y-0.5 hover:bg-brand-900': variant === 'secondary',
            'bg-accent text-dark hover:-translate-y-0.5 hover:bg-[#c99a32]': variant === 'accent',
            'border border-[#CBD8D0] bg-white text-dark hover:border-brand/40 hover:bg-brand-50': variant === 'outline',
            'text-brand hover:bg-brand-50': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
