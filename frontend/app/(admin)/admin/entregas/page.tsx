import { Suspense } from 'react';
import { OperationalRoute } from '@/components/admin/OperationalRoute';

export default function DeliveryPage() {
  return <Suspense fallback={<p>A abrir Entregas…</p>}><OperationalRoute workspace="delivery" /></Suspense>;
}
