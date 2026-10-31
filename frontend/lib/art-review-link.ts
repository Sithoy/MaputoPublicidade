/** Route params may already contain percent escapes. Normalize once, then encode once. */
export function artReviewEndpoint(routeToken: unknown): string | null {
  if (typeof routeToken !== 'string' || !routeToken || routeToken.length > 3072) return null;
  try {
    const token = decodeURIComponent(routeToken);
    // Django-signed tokens use these characters only. Reject ambiguous double
    // encoding and path/query separators instead of repeatedly decoding input.
    if (token.length > 1024 || !/^[A-Za-z0-9_.:-]+$/.test(token)) return null;
    return `/api/art-review/${encodeURIComponent(token)}/`;
  } catch {
    return null;
  }
}

/** Stable, non-sensitive diagnostics clients can quote to Reception. */
export function artReviewFailure(status: number, code?: string): string {
  if (status === 429) return 'Demasiados acessos. Aguarde um momento e atualize a página. Isto não significa que o link expirou. [ART-RATE-LIMIT]';
  if (status >= 500) return 'Serviço temporariamente indisponível. Tente novamente dentro de instantes. Este erro não indica que o link expirou. [ART-SERVICE]';
  if (code === 'link_expired') return 'O prazo deste link terminou. Peça um novo link à Recepção. Os ficheiros continuam privados. [ART-LINK-EXPIRED]';
  if (code === 'link_revoked') return 'Este link foi desativado pela MP. Contacte a Recepção para confirmar o acesso. [ART-LINK-REVOKED]';
  if (code === 'link_replaced') return 'Foi emitido um novo link para esta arte. Utilize a mensagem mais recente da MP. [ART-LINK-REPLACED]';
  if (code === 'link_outdated') return 'Esta arte já não corresponde à versão atual do trabalho. Peça a versão atual à Recepção. [ART-VERSION-OUTDATED]';
  if (code === 'link_unavailable') return 'Esta arte já não está disponível neste endereço. Contacte a Recepção. [ART-LINK-UNAVAILABLE]';
  if (status === 404 || code === 'link_invalid') return 'Link inválido ou incompleto. Abra o endereço original enviado pela MP, sem o editar. Isto não é uma confirmação de expiração. [ART-LINK-INVALID]';
  return 'Não foi possível validar o acesso à arte. Tente novamente ou contacte a Recepção. [ART-ACCESS]';
}
