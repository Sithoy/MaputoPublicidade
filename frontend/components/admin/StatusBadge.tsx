import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  received: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  quoted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  in_production: 'bg-purple-100 text-purple-700',
  ready: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const statusLabels: Record<string, string> = {
  received: 'Pedido recebido',
  reviewing: 'Em análise',
  quoted: 'Orçamentado',
  approved: 'Aprovado',
  in_production: 'Em produção',
  ready: 'Pronto para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  pending: 'Pendente',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('font-medium', statusStyles[status] || 'bg-gray-100 text-gray-700')}>
      {statusLabels[status] || status}
    </Badge>
  );
}
