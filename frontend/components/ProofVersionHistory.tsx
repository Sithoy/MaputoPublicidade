import { Download } from 'lucide-react';
import type { ProofVersion } from '@/lib/api';
import { cn } from '@/lib/utils';

const decisionStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-brand-50 text-brand-700 ring-brand-200',
  changes_requested: 'bg-red-50 text-red-700 ring-red-200',
};

export function ProofVersionHistory({ versions }: { versions: ProofVersion[] }) {
  if (versions.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        Histórico de versões
      </p>
      <ol className="space-y-2">
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-col gap-2 rounded-xl border border-[#e6ece7] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-dark">v{version.version}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                    decisionStyles[version.client_decision] || 'bg-gray-50 text-gray-600 ring-gray-200'
                  )}
                >
                  {version.client_decision_display || version.client_decision}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#829087]">
                {new Date(version.created_at).toLocaleString('pt-MZ')}
                {version.uploaded_by_name ? ` · ${version.uploaded_by_name}` : ''}
              </p>
              {version.designer_comment ? (
                <p className="mt-1 text-xs leading-5 text-[#5d6d65]">{version.designer_comment}</p>
              ) : null}
              {version.client_comment ? (
                <p className="mt-1 text-xs italic leading-5 text-[#718078]">“{version.client_comment}”</p>
              ) : null}
            </div>
            <a
              href={version.file}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#d7e1da] px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 sm:self-center"
            >
              <Download className="h-3.5 w-3.5" />
              Abrir
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
