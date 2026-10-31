'use client';

import { useSearchParams } from 'next/navigation';
import { ProductionWorkspace } from './ProductionWorkspace';
import { StudioHome } from './StudioHome';
import { DeliveryWorkspace } from './DeliveryWorkspace';

export function OperationalRoute({ workspace }: { workspace: 'studio' | 'production' | 'delivery' }) {
  const query = useSearchParams();
  const reference = query.get(workspace === 'delivery' ? 'encomenda' : 'pedido') || '';
  if (workspace === 'studio') return <StudioHome key={reference} initialReference={reference} />;
  if (workspace === 'delivery') return <DeliveryWorkspace key={reference} initialReference={reference} />;
  return <ProductionWorkspace key={reference} initialReference={reference} />;
}
