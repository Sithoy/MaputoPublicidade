import { Suspense } from 'react';
import { CommunicationWorkspace } from '@/components/admin/CommunicationWorkspace';

export default function SupportInboxPage() {
  return <Suspense fallback={<p>A carregar mensagens…</p>}><CommunicationWorkspace /></Suspense>;
}
