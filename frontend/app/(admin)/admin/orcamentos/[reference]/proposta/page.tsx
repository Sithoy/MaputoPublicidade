'use client';

import { useParams } from 'next/navigation';
import RequestForm from '@/components/admin/RequestForm';

export default function PrepareRequestPage() {
  const { reference } = useParams<{ reference: string }>();
  return <RequestForm key={reference} reference={reference} />;
}
