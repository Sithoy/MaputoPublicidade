/** Only fixed, non-sensitive review destinations may survive sign-in. */
export function brandDeskReturnPath(value: string | null | undefined): string {
  return value && value.trim() === value && /^\/area-cliente\/orcamentos\/[A-Za-z0-9_-]{1,80}(?:#(?:proposta|arte))?$/.test(value)
    ? value : '/area-cliente';
}

export function brandDeskReviewPath(reference: string, kind: 'proposal' | 'art'): string {
  return brandDeskReturnPath(`/area-cliente/orcamentos/${reference}#${kind === 'art' ? 'arte' : 'proposta'}`);
}

export function brandDeskLoginPath(destination: string): string {
  const next = brandDeskReturnPath(destination);
  return next === '/area-cliente' ? '/area-cliente/login' : `/area-cliente/login?next=${encodeURIComponent(next)}`;
}

export const APPROVAL_CHANGED = 'branddesk:approval-changed';
