import { fetchWithAuth } from './auth';

export interface ReceptionRequest {
  reference: string; client_name: string; client_email: string; client_phone: string; client_nuit: string;
  contact_source: string; urgency: string; status: string; notes: string; created_at: string;
  reception_owner: number | null; owner_name: string; reception_notes: string;
  missing_information: string[]; items: { description: string; quantity: number }[]; deadline: string | null;
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
export const updateReception = (reference: string, action: 'claim' | 'handoff' | 'edit' | 'release', data: object = {}) => fetchWithAuth(
  `${receptionBase}${encodeURIComponent(reference)}/${action === 'edit' ? '' : `${action}/`}`,
  { method: action === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
);
