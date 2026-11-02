import { Suspense } from 'react';
import { OperationalRoute } from '@/components/admin/OperationalRoute';

export default function OperationsPage() {
  return <Suspense fallback={<p>A abrir Operações…</p>}><OperationalRoute workspace="operations" /></Suspense>;
}
