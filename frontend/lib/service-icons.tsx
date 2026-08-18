import type { ComponentType, HTMLAttributes } from 'react';
import type { ServiceIconName } from '@/lib/service-catalog';
import { cn } from '@/lib/utils';

export type ServiceIconComponent = ComponentType<HTMLAttributes<HTMLSpanElement>>;

function createFlaticonIcon(iconClass: string): ServiceIconComponent {
  function FlaticonServiceIcon({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
      <span
        {...props}
        aria-hidden="true"
        className={cn('inline-flex items-center justify-center leading-none', className)}
      >
        <i className={cn('fi block leading-none', iconClass)} />
      </span>
    );
  }

  return FlaticonServiceIcon;
}

export const serviceIconMap: Record<ServiceIconName, ServiceIconComponent> = {
  textile: createFlaticonIcon('fi-sr-tshirt'),
  print: createFlaticonIcon('fi-sr-print'),
  branding: createFlaticonIcon('fi-sr-car-side'),
  promotional: createFlaticonIcon('fi-sr-gift'),
  laser: createFlaticonIcon('fi-sr-bullseye-arrow'),
  dimensional: createFlaticonIcon('fi-sr-model-cube'),
};
