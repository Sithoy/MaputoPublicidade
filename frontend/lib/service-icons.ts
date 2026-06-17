import { Box, Crosshair, Gift, Paintbrush, Printer, Shirt, type LucideIcon } from 'lucide-react';
import type { ServiceIconName } from '@/lib/service-catalog';

export const serviceIconMap: Record<ServiceIconName, LucideIcon> = {
  Shirt,
  Printer,
  Paintbrush,
  Gift,
  Crosshair,
  Box,
};
