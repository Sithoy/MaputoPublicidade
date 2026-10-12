export type ReceptionWorkdesk = {
  stage_label: string; next_action: string; blocker: string; waiting_since: string | null;
  owner_id: number | null; owner_name: string;
  requested_date: string | null; confirmed_date: string | null;
  follow_up_date: string | null; follow_up_note: string; last_contact_at: string | null;
};

export function maputoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function deskDate(value: string | null | undefined, withTime = false): string {
  if (!value) return 'Por confirmar';
  const date = new Date(value.length === 10 ? `${value}T12:00:00+02:00` : value);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';
  return date.toLocaleString('pt-MZ', {
    timeZone: 'Africa/Maputo', day: '2-digit', month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function waitingTime(value: string | null, now = new Date()): string {
  if (!value) return 'Início da espera não registado';
  const since = new Date(value).getTime();
  if (Number.isNaN(since)) return 'Início da espera não registado';
  const hours = Math.max(0, Math.floor((now.getTime() - since) / 3600000));
  return hours < 1 ? 'Há menos de 1 hora' : hours < 24 ? `Há ${hours} h` : `Há ${Math.floor(hours / 24)} dia(s)`;
}
