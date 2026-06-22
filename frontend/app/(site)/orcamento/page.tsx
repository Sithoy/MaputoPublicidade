import { Suspense } from 'react';
import { OrcamentoContent } from '@/components/OrcamentoContent';

export const metadata = {
  title: 'Pedir Orçamento | Maputo Publicidade',
  description: 'Peça um orçamento personalizado para a sua empresa.',
};

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-gray-500">A carregar formulário...</div>}>
      <OrcamentoContent />
    </Suspense>
  );
}
