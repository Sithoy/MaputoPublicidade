import { Suspense } from 'react';
import { SupportDesk } from '@/components/SupportDesk';

export default function SupportPage() {
  return <Suspense fallback={<p>A carregar apoio…</p>}><SupportDesk /></Suspense>;
}
