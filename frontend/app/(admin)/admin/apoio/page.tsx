import { Suspense } from 'react';
import { SupportDesk } from '@/components/SupportDesk';

export default function SupportInboxPage() {
  return <Suspense fallback={<p>A carregar mensagens…</p>}><SupportDesk staff /></Suspense>;
}
