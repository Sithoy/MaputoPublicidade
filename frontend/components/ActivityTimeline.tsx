import type { ActivityEvent } from '@/lib/api';
import { orderStatusLabels } from '@/lib/status';
import { cn } from '@/lib/utils';

function describe(event: ActivityEvent): string {
  if (event.action === 'status_changed' && event.from_status && event.to_status) {
    const from = orderStatusLabels[event.from_status] || event.from_status;
    const to = orderStatusLabels[event.to_status] || event.to_status;
    return `${from} → ${to}`;
  }
  if (event.action === 'payment_status_changed' && event.to_status) {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      partial: 'Parcialmente pago',
      paid: 'Pago',
    };
    return labels[event.to_status] || event.to_status;
  }
  return event.action_display || event.action;
}

export function ActivityTimeline({
  events,
  className,
}: {
  events: ActivityEvent[];
  className?: string;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Ainda não há actividade registada.</p>;
  }

  return (
    <ol className={cn('relative space-y-4', className)}>
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pl-6">
          <span
            className={cn(
              'absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full',
              index === 0 ? 'bg-brand' : 'bg-[#c8d2cb]'
            )}
            aria-hidden="true"
          />
          {index < events.length - 1 ? (
            <span
              className="absolute bottom-[-16px] left-[4.5px] top-4 w-px bg-[#e2e9e3]"
              aria-hidden="true"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-dark">{describe(event)}</p>
              <time className="text-xs text-[#829087]">
                {new Date(event.created_at).toLocaleString('pt-MZ')}
              </time>
            </div>
            <p className="mt-0.5 text-xs text-[#718078]">
              {event.actor_name ? `Por ${event.actor_name}` : 'Registado automaticamente'}
            </p>
            {event.comment ? (
              <p className="mt-1 text-xs leading-5 text-[#5d6d65]">“{event.comment}”</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
