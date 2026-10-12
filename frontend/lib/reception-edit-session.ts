// Per-tab, in-memory leases. Never persist tokens or send them to external origins.
const sessions = new Map<string, string>();
export function registerReceptionEdit(reference: string, token: string, order?: string | null) { sessions.set(reference, token); if (order) sessions.set(order, token); }
export function forgetReceptionEdit(token: string) { sessions.forEach((value, reference) => { if (value === token) sessions.delete(reference); }); }
export function clearReceptionEdits() { sessions.clear(); }
export function receptionEditHeaders(path: string, method = 'GET'): Record<string, string> {
  if (typeof window === 'undefined' || ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return {};
  const match = path.match(/^\/api\/(?:reception|quotes|orders)\/([^/?]+)(?:\/|$)/);
  const token = match ? sessions.get(decodeURIComponent(match[1])) : undefined;
  return token ? { 'X-Reception-Edit-Token': token } : {};
}
