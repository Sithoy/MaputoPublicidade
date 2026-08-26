import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const mznFormatter = new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 });

/** Format a monetary value in Meticais using a single, consistent locale. */
export function formatMZN(value: number): string {
  return `${mznFormatter.format(value)} MZN`;
}
