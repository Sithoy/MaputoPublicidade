import { fetchWithAuth } from './auth';

export interface ReceptionBriefing {
  project_name: string; description: string; deadline: string | null;
  fulfilment: '' | 'pickup' | 'delivery' | 'installation'; delivery_address: string;
  source_reference: string; needs_design: boolean; questions: string;
}
export interface ReceptionItem {
  id?: number; description: string; quantity: number;
  size?: string; material?: string; colors?: string; specifications?: string; needs_design?: boolean;
}

export interface ReceptionRequest {
  reference: string; client_name: string; client_email: string; client_phone: string; client_nuit: string;
  contact_source: string; urgency: string; status: string; notes: string; created_at: string;
  reception_owner: number | null; owner_name: string; reception_notes: string;
  missing_information: string[]; items: ReceptionItem[]; deadline: string | null;
  briefing?: ReceptionBriefing;
  attachments?: { id: number; name: string; size: number; is_internal: boolean }[];
}
export interface ReceptionSummary {
  counts: { queue: number; unassigned: number; mine: number; messages: number; ready: number };
  messages: { id: number; subject: string; client_name: string }[];
  ready: { reference: string }[];
  handovers: { reference: string; client_name: string; completed_at: string }[];
}
export interface ReceptionPage { results: ReceptionRequest[]; next: string | null }
export const receptionBase = '/api/reception/';
export const getReceptionSummary = (): Promise<ReceptionSummary> => fetchWithAuth(`${receptionBase}summary/`);
export const getReceptionQueue = (scope: string): Promise<ReceptionPage> => fetchWithAuth(`${receptionBase}?scope=${encodeURIComponent(scope)}`);
export const updateReception = (reference: string, action: 'claim' | 'handoff' | 'edit' | 'release', data: object = {}, files: File[] = []) => {
  const path = `${receptionBase}${encodeURIComponent(reference)}/${action === 'edit' ? '' : `${action}/`}`;
  if (files.length && action === 'edit') {
    const body = new FormData();
    body.append('payload', JSON.stringify(data));
    files.forEach((file) => body.append('files', file));
    return fetchWithAuth(path, { method: 'PATCH', body });
  }
  return fetchWithAuth(path, { method: action === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
};
