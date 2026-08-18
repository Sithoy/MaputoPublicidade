import type { ComponentType, SVGProps } from 'react';
import type { ServiceIconName } from '@/lib/service-catalog';

export type ServiceIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const sharedProps = {
  viewBox: '0 0 48 48',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  focusable: false,
} as const;

function TextileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="M18 9.5 24 14l6-4.5 9 5.7-4.6 8.2-5.1-2.7V39H18.7V20.7l-5.1 2.7L9 15.2l9-5.7Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M18 9.5 24 14l6-4.5 9 5.7-4.6 8.2-5.1-2.7V39H18.7V20.7l-5.1 2.7L9 15.2l9-5.7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 9.5c.7 4.1 2.7 6.2 6 6.2s5.3-2.1 6-6.2M22 25.5h4M22 29h4M22 32.5h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrintStudioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="M13 8h23v28H13z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M13 8h23v28H13V8Zm0 5H8v27h23v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 15h11M19 20h11M19 25h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="19" cy="31" r="1.8" fill="currentColor" />
      <circle cx="25" cy="31" r="1.8" fill="currentColor" fillOpacity="0.65" />
      <circle cx="31" cy="31" r="1.8" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

function BrandingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="M8 17h24l7 8v10H8V17Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M8 17h24l7 8v10h-4M8 17v18h5m7 0h8m11-10h-9v-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="m13 22 8 8 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="35" r="3.5" fill="white" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      <circle cx="31.5" cy="35" r="3.5" fill="white" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
      <path d="M11 13h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PromotionalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="M11 19h20v19H11z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M11 19h20v19H11V19Zm-2-5h24v7H9v-7Zm12 0v24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 14c-5.3 0-7.8-1.6-7.8-4 0-1.8 1.4-3 3.2-3 3 0 4.6 3.7 4.6 7Zm0 0c5.3 0 7.8-1.6 7.8-4 0-1.8-1.4-3-3.2-3-3 0-4.6 3.7-4.6 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m37 8 .8 2.2L40 11l-2.2.8L37 14l-.8-2.2L34 11l2.2-.8L37 8Z" fill="currentColor" />
    </svg>
  );
}

function LaserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="M8 18h27v22H8z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M8 18h27v22H8V18Zm5 16c5-5 10-7 16-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M37 7 25 25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="m25 21 .9 2.5 2.5.9-2.5.9L25 28l-.9-2.7-2.5-.9 2.5-.9L25 21Z"
        fill="currentColor"
      />
      <path d="M35 7h5M37.5 4.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DimensionalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...sharedProps} {...props}>
      <path
        d="m10 16 9-7h21v24l-9 7H10V16Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M10 16h21v24H10V16Zm21 0 9-7v24l-9 7V16ZM10 16l9-7h21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 33V23l5 7 5-7v10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M35 19v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export const serviceIconMap: Record<ServiceIconName, ServiceIconComponent> = {
  textile: TextileIcon,
  print: PrintStudioIcon,
  branding: BrandingIcon,
  promotional: PromotionalIcon,
  laser: LaserIcon,
  dimensional: DimensionalIcon,
};
