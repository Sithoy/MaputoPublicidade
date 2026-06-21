import { apiUrl } from './api';

const AUTH_BASE = '/_allauth/app/v1';

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return accessToken || localStorage.getItem('mp_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return refreshTokenValue || localStorage.getItem('mp_refresh_token');
}

export function setToken(token: string | null) {
  accessToken = token;
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('mp_access_token', token);
  else localStorage.removeItem('mp_access_token');
}

export function setRefreshToken(token: string | null) {
  refreshTokenValue = token;
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('mp_refresh_token', token);
  else localStorage.removeItem('mp_refresh_token');
}

export function removeToken() {
  accessToken = null;
  refreshTokenValue = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mp_access_token');
  localStorage.removeItem('mp_refresh_token');
}

interface AuthResponse {
  status: number;
  data?: {
    user?: {
      id: number;
      email: string;
      display?: string;
      is_staff?: boolean;
      is_superuser?: boolean;
    };
    access_token?: string;
    refresh_token?: string;
  };
  meta?: {
    is_authenticated?: boolean;
    access_token?: string;
    refresh_token?: string;
  };
}

function authUrl(path: string): string {
  return apiUrl(`${AUTH_BASE}${path}`);
}

async function readJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;

  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function authUnavailableMessage(status: number) {
  if (status === 404) {
    return 'Servidor de autenticacao indisponivel. Verifique a ligacao ao backend.';
  }
  return 'Credenciais invalidas';
}

export async function login(email: string, password: string) {
  const res = await fetch(authUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await readJson<AuthResponse>(res);
  const accessTokenValue = data?.meta?.access_token || data?.data?.access_token;
  const refreshToken = data?.meta?.refresh_token || data?.data?.refresh_token;

  if (!res.ok || !accessTokenValue) {
    throw new Error(authUnavailableMessage(res.status));
  }

  setToken(accessTokenValue);
  if (refreshToken) setRefreshToken(refreshToken);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const [first_name, ...rest] = name.trim().split(' ');
  const last_name = rest.join(' ');
  const res = await fetch(authUrl('/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, first_name, last_name }),
  });
  const data = await readJson<AuthResponse>(res);
  const accessTokenValue = data?.meta?.access_token || data?.data?.access_token;
  const refreshToken = data?.meta?.refresh_token || data?.data?.refresh_token;

  if (!res.ok || !accessTokenValue) {
    throw new Error('Erro ao criar conta');
  }

  setToken(accessTokenValue);
  if (refreshToken) setRefreshToken(refreshToken);
  return data;
}

export async function logout() {
  const token = getToken();
  try {
    await fetch(authUrl('/auth/logout'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    removeToken();
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(authUrl('/tokens/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    removeToken();
    return null;
  }
  const data = await readJson<AuthResponse>(res);
  const access = data?.data?.access_token || data?.meta?.access_token;
  const nextRefresh = data?.data?.refresh_token || data?.meta?.refresh_token;
  if (access) setToken(access);
  if (nextRefresh) setRefreshToken(nextRefresh);
  return access || null;
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(apiUrl(path), { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(apiUrl(path), { ...options, headers });
    }
  }

  if (res.status === 401) removeToken();
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function fetchSession() {
  const token = getToken();
  const res = await fetch(authUrl('/auth/session'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await readJson<AuthResponse>(res);
  if (!res.ok || !data) {
    removeToken();
    throw new Error('Sessao invalida');
  }
  return data;
}
