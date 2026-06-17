import { apiUrl } from './api';

let accessToken: string | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return accessToken || localStorage.getItem('mp_access_token');
}

export function setToken(token: string | null) {
  accessToken = token;
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('mp_access_token', token);
  else localStorage.removeItem('mp_access_token');
}

export function removeToken() {
  accessToken = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mp_access_token');
}

export async function login(email: string, password: string) {
  const res = await fetch(apiUrl('/api/auth/login/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  const data = await res.json();
  setToken(data.access);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const res = await fetch(apiUrl('/api/auth/register/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, first_name: name }),
  });
  if (!res.ok) throw new Error('Erro ao criar conta');
  return res.json();
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), { ...options, headers });
  if (res.status === 401) removeToken();
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
