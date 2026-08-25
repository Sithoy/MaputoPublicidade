import type { Order, OrderStatus } from './api';

export const workflowStages = [
  {
    key: 'request',
    shortLabel: 'Pedido',
    label: 'Pedido recebido',
    description: 'O cliente partilha o objectivo e os materiais disponíveis.',
  },
  {
    key: 'review',
    shortLabel: 'Análise',
    label: 'Análise do pedido',
    description: 'A equipa confirma quantidades, formato, prazo e necessidades.',
  },
  {
    key: 'proposal',
    shortLabel: 'Proposta',
    label: 'Proposta e aprovação',
    description: 'Preço, arte e condições ficam disponíveis para decisão.',
  },
  {
    key: 'confirmed',
    shortLabel: 'Confirmação',
    label: 'Trabalho confirmado',
    description: 'O pedido aprovado entra no plano de execução.',
  },
  {
    key: 'production',
    shortLabel: 'Produção',
    label: 'Produção e controlo',
    description: 'A equipa produz, acompanha e valida a qualidade.',
  },
  {
    key: 'delivery',
    shortLabel: 'Entrega',
    label: 'Entrega e conclusão',
    description: 'O trabalho é entregue, confirmado e guardado no histórico.',
  },
] as const;

const stageByStatus: Record<OrderStatus, number> = {
  received: 0,
  reviewing: 1,
  quoted: 2,
  approved: 3,
  in_production: 4,
  ready: 5,
  delivered: 5,
  cancelled: -1,
};

export type ClientNextAction = {
  label: string;
  description: string;
  actionRequired: boolean;
  tone: 'attention' | 'progress' | 'complete' | 'muted';
};

type WorkflowOrder = Pick<Order, 'status' | 'payment_status' | 'amount_due' | 'artwork'>;

export function getOrderStageIndex(status: OrderStatus): number {
  return stageByStatus[status];
}

export function getOrderProgress(status: OrderStatus): number {
  if (status === 'cancelled') return 0;
  if (status === 'delivered') return 100;

  const current = getOrderStageIndex(status);
  return Math.round(((current + 0.5) / workflowStages.length) * 100);
}

export function getClientNextAction(order: WorkflowOrder): ClientNextAction {
  if (order.status === 'cancelled') {
    return {
      label: 'Pedido cancelado',
      description: 'Este pedido deixou de estar activo.',
      actionRequired: false,
      tone: 'muted',
    };
  }

  if (order.status === 'quoted') {
    return {
      label: 'Aprovar a proposta',
      description: 'Reveja o valor e confirme para avançarmos.',
      actionRequired: true,
      tone: 'attention',
    };
  }

  if (order.artwork?.status === 'pending') {
    return {
      label: 'Rever a prova digital',
      description: 'A arte está pronta para aprovação ou comentários.',
      actionRequired: true,
      tone: 'attention',
    };
  }

  if (order.status === 'ready') {
    return {
      label: 'Preparar a recepção',
      description: 'O trabalho está pronto para entrega ou levantamento.',
      actionRequired: true,
      tone: 'attention',
    };
  }

  if (order.payment_status !== 'paid' && (order.amount_due || 0) > 0) {
    return {
      label: 'Regularizar o pagamento',
      description: 'Existe um saldo associado a este pedido.',
      actionRequired: true,
      tone: 'attention',
    };
  }

  if (order.status === 'received' || order.status === 'reviewing') {
    return {
      label: 'Estamos a preparar a proposta',
      description: 'A equipa está a validar os detalhes do seu pedido.',
      actionRequired: false,
      tone: 'progress',
    };
  }

  if (order.status === 'approved') {
    return {
      label: 'Pedido confirmado',
      description: 'O trabalho está a ser preparado para produção.',
      actionRequired: false,
      tone: 'progress',
    };
  }

  if (order.status === 'in_production') {
    return {
      label: 'Produção em curso',
      description: 'A equipa está a executar e controlar o trabalho.',
      actionRequired: false,
      tone: 'progress',
    };
  }

  return {
    label: 'Trabalho concluído',
    description: 'A entrega foi registada e permanece no seu histórico.',
    actionRequired: false,
    tone: 'complete',
  };
}

