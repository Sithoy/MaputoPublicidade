export type ProposalDecision = { client_decision: 'accept' | 'changes' | 'decline'; at: string; contact_name?: string; channel: string; comment?: string };
export type ClientProposal = {
  snapshot?: string;
  reference: string; version: number; client_name: string; valid_until: string | null;
  total: string; subtotal: string; discount: string; tax_rate: string; tax_amount: string;
  vat_exempt: boolean; delivery_days: number | null; payment: string; terms: string; notes: string;
  decision: ProposalDecision | null; expired: boolean;
  items: { description: string; quantity: number; unit_price: string | null; notes: string; specifications: string;
    configuration?: { selections?: { label: string; value: string }[] };
    apparel?: { rows?: { model: string; color: string; size: string; quantity: number }[]; pending?: boolean } | null }[];
};
export const decisionLabels = { accept: 'Proposta aceite', changes: 'Alterações pedidas', decline: 'Proposta recusada' };

export class ReviewLinkError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

export async function proposalRequest(token: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch('/api/proposal-review/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MP-Proposal-Token': token },
    body: JSON.stringify(body), cache: 'no-store', signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ReviewLinkError(typeof data.detail === 'string' ? data.detail : 'Não foi possível concluir. Verifique os campos e tente novamente.', data.code);
  }
  return response;
}
