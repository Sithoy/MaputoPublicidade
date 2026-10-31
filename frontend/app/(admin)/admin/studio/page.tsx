import { Suspense } from 'react';
import { OperationalRoute } from '@/components/admin/OperationalRoute';

export default function StudioPage() { return <Suspense fallback={<p>A abrir Studio…</p>}><OperationalRoute workspace="studio" /></Suspense>; }
