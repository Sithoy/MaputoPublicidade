import { apiUrl } from './api';

// Keep authentication behind our own server route. This avoids exposing the
// backend origin to the browser and does not depend on a build-time rewrite.
const AUTH_BASE = '/auth-api/app/v1';
const AUTH_UNAVAILABLE_MESSAGE =
  'Servidor de autenticacao indisponivel. Verifique a ligacao ao backend.';

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

// Cache the session briefly so navigating between guarded pages does not
// trigger a /auth/session request per page mount. Cleared on any token change.
const SESSION_CACHE_TTL_MS = 60_000;
let sessionCache: { data: AuthResponse; expiresAt: number } | null = null;
let sessionPromise: Promise<AuthResponse> | null = null;

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
  sessionCache = null;
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
  sessionCache = null;
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
      role?: 'owner' | 'administrator' | 'commercial' | 'production' | 'finance' | 'content' | 'client';
      role_display?: string;
      capabilities?: string[];
    };
    access_token?: string;
    refresh_token?: string;
  };
  meta?: {
    is_authenticated?: boolean;
    access_token?: string;
    refresh_token?: string;
  };
  errors?: Array<{
    message?: string;
    code?: string;
    param?: string;
  }>;
}

export interface ClientRegistration {
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  nuit?: string;
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
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
  if (status === 404 || status >= 500) {
    return AUTH_UNAVAILABLE_MESSAGE;
  }
  return 'Credenciais invalidas';
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(authUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }
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

function registrationError(data: AuthResponse | null, status: number) {
  if (status === 404 || status >= 500) return AUTH_UNAVAILABLE_MESSAGE;

  const firstError = data?.errors?.[0];
  const fieldNames: Record<string, string> = {
    email: 'E-mail',
    password: 'Palavra-passe',
    password_confirm: 'Confirmação da palavra-passe',
    first_name: 'Nome',
    last_name: 'Apelido',
    accept_terms: 'Termos e privacidade',
  };
  if (firstError?.message) {
    const label = firstError.param ? fieldNames[firstError.param] : undefined;
    return label ? `${label}: ${firstError.message}` : firstError.message;
  }
  return 'Não foi possível criar a conta. Confirme os dados e tente novamente.';
}

export async function registerClient(registration: ClientRegistration) {
  let res: Response;
  try {
    res = await fetch(authUrl('/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registration.email.trim(),
        password: registration.password,
        password_confirm: registration.passwordConfirm,
        first_name: registration.firstName.trim(),
        last_name: registration.lastName.trim(),
        company: registration.company?.trim() || '',
        phone: registration.phone?.trim() || '',
        nuit: registration.nuit?.trim() || '',
        accept_terms: registration.acceptTerms,
      }),
    });
  } catch {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }
  const data = await readJson<AuthResponse>(res);
  const accessTokenValue = data?.meta?.access_token || data?.data?.access_token;
  const refreshToken = data?.meta?.refresh_token || data?.data?.refresh_token;

  if (!res.ok || !accessTokenValue) {
    throw new Error(registrationError(data, res.status));
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
  if (!res.ok) {
    // Surface the backend's error detail (e.g. invalid status transition)
    // instead of a bare status code.
    const body = await readJson<{ detail?: string; non_field_errors?: string[] }>(res);
    const message =
      body?.detail || body?.non_field_errors?.[0] || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

/** Authenticated file download (e.g. generated PDF documents). */
export async function downloadWithAuth(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchSession() {
  if (sessionCache && sessionCache.expiresAt > Date.now()) {
    return sessionCache.data;
  }

  if (!sessionPromise) {
    sessionPromise = (async () => {
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
    })().finally(() => {
      sessionPromise = null;
    });
  }

  const data = await sessionPromise;
  // Only cache if the session still belongs to the current token.
  if (getToken()) {
    sessionCache = { data, expiresAt: Date.now() + SESSION_CACHE_TTL_MS };
  }
  return data;
}
