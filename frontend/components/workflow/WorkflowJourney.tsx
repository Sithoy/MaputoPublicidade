import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrderStageIndex, workflowStages } from '@/lib/workflow';
import type { OrderStatus } from '@/lib/api';

type WorkflowJourneyProps = {
  status?: OrderStatus;
  compact?: boolean;
  className?: string;
};

export function WorkflowJourney({ status, compact = false, className }: WorkflowJourneyProps) {
  const currentStep = status ? getOrderStageIndex(status) : -1;
  const cancelled = status === 'cancelled';

  return (
    <div className={cn('w-full min-w-0 max-w-full overflow-x-auto pb-2', className)}>
      <ol
        className="grid min-w-[760px] grid-cols-6"
        aria-label="Percurso do pedido, da recepção à entrega"
      >
        {workflowStages.map((stage, index) => {
          const completed = !cancelled && currentStep > index;
          const current = !cancelled && currentStep === index;
          const active = completed || current;

          return (
            <li key={stage.key} className="relative pr-3 last:pr-0" aria-current={current ? 'step' : undefined}>
              {index < workflowStages.length - 1 ? (
                <span
                  className={cn(
                    'absolute left-7 right-0 top-[15px] h-px',
                    completed ? 'bg-brand-500' : 'bg-[#dce5de]'
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                    completed && 'border-brand-700 bg-brand-700 text-white',
                    current && 'border-brand-600 bg-white text-brand-800 ring-4 ring-brand-50',
                    !active && 'border-[#d7e0d9] bg-[#f5f7f5] text-[#8a9890]',
                    cancelled && 'border-[#e4e8e5] bg-[#f7f8f7] text-[#9aa49e]'
                  )}
                >
                  {completed ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <p
                  className={cn(
                    'mt-3 text-xs font-semibold',
                    current ? 'text-brand-800' : active ? 'text-dark' : 'text-[#7c8a82]'
                  )}
                >
                  {stage.shortLabel}
                </p>
                {!compact ? (
                  <p className="mt-1 max-w-[125px] text-[11px] leading-[1.45] text-[#829087]">
                    {stage.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
