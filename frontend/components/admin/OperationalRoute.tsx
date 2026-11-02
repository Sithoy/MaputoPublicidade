'use client';

import { useSearchParams } from 'next/navigation';
import { OperationsHome } from './OperationsHome';
import { DeliveryWorkspace } from './DeliveryWorkspace';

export function OperationalRoute({ workspace }: { workspace: 'studio' | 'production' | 'delivery' | 'operations' }) {
  const query = useSearchParams();
  const reference = query.get(workspace === 'delivery' ? 'encomenda' : 'pedido') || '';
  if (workspace === 'delivery') return <DeliveryWorkspace key={reference} initialReference={reference} />;
  return <OperationsHome key={reference} initialReference={reference} />;
}
