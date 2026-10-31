import { Suspense } from 'react';
import { OperationalRoute } from '@/components/admin/OperationalRoute';

export default function ProductionPage() { return <Suspense fallback={<p>A abrir Produção…</p>}><OperationalRoute workspace="production" /></Suspense>; }
