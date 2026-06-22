export function apiUrl(path: string): string {
  if (typeof window === 'undefined') {
    const base = process.env.INTERNAL_API_URL || 'http://backend:8000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

const DEFAULT_FETCH_TIMEOUT_MS = 10000;

export async function get<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const hasExternalSignal = options?.signal != null;
  const timeoutId = hasExternalSignal
    ? undefined
    : setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers: { Accept: 'application/json', ...(options?.headers || {}) },
      signal: hasExternalSignal ? options.signal : controller.signal,
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    if (!hasExternalSignal) clearTimeout(timeoutId);
  }
}

export async function post<T = unknown>(
  path: string,
  body: FormData | Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit;
  if (body instanceof FormData) {
    payload = body;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    body: payload,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function put<T = unknown>(
  path: string,
  body: FormData | Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit;
  if (body instanceof FormData) {
    payload = body;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), {
    method: 'PUT',
    headers,
    body: payload,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function patch<T = unknown>(
  path: string,
  body: FormData | Record<string, unknown>,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit;
  if (body instanceof FormData) {
    payload = body;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), {
    method: 'PATCH',
    headers,
    body: payload,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PATCH ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function del<T = unknown>(path: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export type ProductVariant = {
  id: number;
  name: string;
  sku?: string;
  price: number;
  image?: string;
  position?: number;
  is_active?: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image?: string;
  category: string;
  category_id?: number;
  materials?: string[];
  sizes?: string[];
  min_quantity?: number;
  lead_time?: string;
  base_price?: number;
  starting_price?: number;
  has_variants?: boolean;
  variants?: ProductVariant[];
  pricing_complexity?: 'simple' | 'complex';
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  icon_name?: string;
  short_description?: string;
  description?: string;
  image?: string;
  display_order?: number;
  is_active?: boolean;
};

export type Package = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  items?: string[];
  image?: string;
  target_audience?: string;
  is_recurring?: boolean;
  is_active?: boolean;
};

export type Quote = {
  id: number;
  reference: string;
  product_name: string;
  product_slug?: string;
  quantity: number;
  status: string;
  status_display?: string;
  created_at: string;
  estimated_price?: number;
  final_price?: number;
};

export type PortfolioItem = {
  id: number;
  title: string;
  slug: string;
  category?: number | null;
  category_name?: string;
  description?: string;
  image?: string;
  client_name?: string;
  completion_date?: string;
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Partner = {
  id: number;
  name: string;
  slug: string;
  sector?: string;
  description?: string;
  logo?: string;
  website?: string;
  display_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserProfile = {
  company?: string;
  phone?: string;
  nuit?: string;
  address?: string;
  billing_address?: string;
};

export type OrderStatus =
  | 'received'
  | 'reviewing'
  | 'quoted'
  | 'approved'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export type Order = {
  id: number;
  reference: string;
  quote?: number | null;
  quote_reference?: string;
  user?: number;
  user_email?: string;
  user_name?: string;
  profile?: UserProfile;
  product_name: string;
  quantity: number;
  size?: string;
  material?: string;
  colors?: string;
  needs_design?: boolean;
  client_file?: string;
  final_price?: number;
  payment_status: PaymentStatus;
  payment_status_display?: string;
  amount_paid?: number;
  amount_due?: number;
  status: OrderStatus;
  status_display?: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_method_display?: string;
  delivery_address?: string;
  internal_notes?: string;
  artwork?: {
    id: number;
    status: 'pending' | 'approved' | 'changes_requested';
    status_display?: string;
    proof_file?: string;
    designer_comment?: string;
    client_comment?: string;
    requested_changes?: string;
    approved_at?: string;
  } | null;
  created_at: string;
  updated_at?: string;
};

export type User = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_active?: boolean;
  profile?: UserProfile;
};
