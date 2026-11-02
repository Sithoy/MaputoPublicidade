import { Suspense } from 'react';
import { WorkflowBoard } from '@/components/admin/WorkflowBoard';

export default function BoardPage() {
  return <Suspense fallback={<p>A abrir o quadro…</p>}><WorkflowBoard /></Suspense>;
}
