"""Public-safe journey projection. A view of existing state, never a new status."""
from .studio import readiness

STAGES = [
    ('briefing', 'Briefing'), ('proposal', 'Proposta'), ('client', 'Decisão do cliente'),
    ('art', 'Preparar arte'), ('art_client', 'Aprovação da arte'),
    ('production', 'Produção'), ('delivery', 'Pronto para entrega'), ('delivered', 'Entregue'),
]


def job_journey(quote=None, order=None):
    if order is None and quote is not None:
        order = getattr(quote, 'order', None)
    status = order.status if order else quote.status
    operation = readiness(quote) if quote else None
    needs_art = operation['needs_art'] if operation else False
    index, team, blocker, action = 0, 'Recepção', '', 'Completar briefing'
    cancelled = status == 'cancelled' or bool(quote and quote.status == 'cancelled')
    if status == 'delivered':
        index, team, action = 7, 'Entrega', 'Consultar entrega'
    elif status == 'ready':
        index, team, action = 6, 'Entrega', 'Coordenar entrega ou levantamento'
    elif status == 'in_production':
        index, team, action = 5, 'Produção', 'Acompanhar execução e conferência'
    elif operation and operation['stage'] != 'awaiting_order':
        if operation['stage'] == 'client_art':
            index, team, blocker, action = 4, 'Cliente', 'Decisão do cliente sobre a arte', 'Rever e decidir a arte'
        elif not operation['art_ready']:
            index, team, action = 3, 'Artes', 'Preparar ou ajustar a arte'
        else:
            index, team, action = 5, 'Produção', 'Conferir e iniciar produção'
        if operation['missing']:
            blocker, action = 'Informação técnica por confirmar', 'Confirmar detalhes com a Recepção'
    elif quote and quote.price_approved_at:
        index, team, blocker, action = 5, 'Recepção', 'Ordem operacional por confirmar', 'Confirmar ordem operacional'
    elif quote and (quote.proposal_stage == 'sent' or (quote.proposal_stage == 'legacy' and quote.status == 'quoted')):
        index, team, blocker, action = 2, 'Cliente', 'Decisão do cliente sobre a proposta', 'Rever e decidir a proposta'
    elif quote and (quote.reception_completed_at or quote.proposal_prepared_by_id or quote.proposal_stage in {'returned', 'review', 'approved'}):
        index, action = 1, 'Preparar e enviar proposta'
    elif not quote:
        index = {'received': 0, 'reviewing': 1, 'quoted': 2, 'approved': 5}.get(status, 0)
        team = 'Cliente' if index == 2 else 'Produção' if index == 5 else 'Recepção'
        action = 'Rever e decidir a proposta' if index == 2 else 'Conferir e iniciar produção' if index == 5 else 'Confirmar detalhes do pedido'
    return {
        'key': STAGES[index][0], 'index': index,
        'label': 'Cancelado' if cancelled else STAGES[index][1],
        'cancelled': cancelled, 'needs_art': needs_art,
        'team': team, 'blocker': '' if cancelled else blocker,
        'next_action': 'Consultar histórico' if cancelled else action,
        'steps': [{'key': key, 'label': label, 'skipped': not needs_art and i in {3, 4}}
                  for i, (key, label) in enumerate(STAGES)],
    }
