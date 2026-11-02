import type { Order, OrderStatus } from './api';

export type JobJourney = {
  key: string; index: number; label: string; cancelled: boolean; needs_art: boolean;
  team: string; blocker: string; next_action: string;
  steps: { key: string; label: string; skipped: boolean }[];
};

export const workflowStages = [
  { key: 'briefing', shortLabel: 'Briefing', description: 'Confirmar necessidades e materiais.' },
  { key: 'proposal', shortLabel: 'Proposta', description: 'Preparar e enviar as condições.' },
  { key: 'client', shortLabel: 'Decisão do cliente', description: 'Aceitar ou ajustar a proposta.' },
  { key: 'art', shortLabel: 'Preparar arte', description: 'Criar ou adaptar, quando necessário.' },
  { key: 'art_client', shortLabel: 'Aprovação da arte', description: 'Decidir sobre a versão atual.' },
  { key: 'production', shortLabel: 'Produção', description: 'Produzir e conferir o trabalho.' },
  { key: 'delivery', shortLabel: 'Pronto para entrega', description: 'Coordenar entrega ou levantamento.' },
  { key: 'delivered', shortLabel: 'Entregue', description: 'Entrega registada no histórico.' },
] as const;
const stageByStatus: Record<OrderStatus, number> = {
  received: 0, reviewing: 0, quoted: 2, approved: 5,
  in_production: 5, ready: 6, delivered: 7, cancelled: -1,
};

export type ClientNextAction = {
  label: string;
  description: string;
  actionRequired: boolean;
  tone: 'attention' | 'progress' | 'complete' | 'muted';
};

type WorkflowOrder = Pick<Order, 'status' | 'payment_status' | 'amount_due' | 'artwork' | 'journey'>;

export function getOrderStageIndex(status: OrderStatus, journey?: JobJourney): number {
  return journey?.cancelled ? -1 : journey?.index ?? stageByStatus[status];
}

export function getOrderProgress(status: OrderStatus, journey?: JobJourney): number {
  if (status === 'cancelled' || journey?.cancelled) return 0;
  if (status === 'delivered') return 100;

  const current = getOrderStageIndex(status, journey);
  return Math.round(((current + 0.5) / workflowStages.length) * 100);
}

export function getClientNextAction(order: WorkflowOrder): ClientNextAction {
  if (order.journey && !order.journey.cancelled) {
    const journey = order.journey;
    const required = ['client', 'art_client'].includes(journey.key);
    return {
      label: required ? journey.next_action : journey.label,
      description: journey.blocker || (journey.key === 'delivered' ? 'A entrega fica disponível no seu histórico.' : `Próximo passo com a equipa de ${journey.team}.`),
      actionRequired: required, tone: required ? 'attention' : journey.key === 'delivered' ? 'complete' : 'progress',
    };
  }
  if (order.status === 'cancelled' || order.journey?.cancelled) {
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

