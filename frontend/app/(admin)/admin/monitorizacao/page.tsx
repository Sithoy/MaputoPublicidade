import { Suspense } from 'react';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

export default function MonitoringPage() {
  return <Suspense fallback={<p role="status">A preparar monitorização…</p>}><MonitoringDashboard /></Suspense>;
}
