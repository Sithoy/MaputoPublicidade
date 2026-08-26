const LOCAL_SERVER_API_ORIGIN = 'http://backend:8000';
const PUBLIC_API_ORIGIN = 'https://www.maputopublicidade.com';

function isLocalOnlyOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'backend' || hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

type ApiEnvironment = Record<string, string | undefined>;

export function resolveServerApiOrigin(env: ApiEnvironment = process.env): string {
  const configuredOrigin = env.INTERNAL_API_URL?.replace(/\/$/, '');
  const isVercel = env.VERCEL === '1' || Boolean(env.VERCEL_ENV);

  if (isVercel && (!configuredOrigin || isLocalOnlyOrigin(configuredOrigin))) {
    return (env.PUBLIC_CONTENT_API_ORIGIN || PUBLIC_API_ORIGIN).replace(/\/$/, '');
  }

  return configuredOrigin || LOCAL_SERVER_API_ORIGIN;
}

export function resolveServerGetFallbackUrl(
  path: string,
  env: ApiEnvironment = process.env
): string | null {
  const publicOrigin = (env.PUBLIC_CONTENT_API_ORIGIN || PUBLIC_API_ORIGIN).replace(/\/$/, '');
  if (
    /^https?:\/\//i.test(path) ||
    resolveServerApiOrigin(env).replace(/\/$/, '') === publicOrigin
  ) {
    return null;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${publicOrigin}${cleanPath}`;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') {
    return `${resolveServerApiOrigin()}${cleanPath}`;
  }
  return cleanPath;
}

const DEFAULT_FETCH_TIMEOUT_MS = 10000;

export async function get<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const request = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const hasExternalSignal = options?.signal != null;
    const timeoutId = hasExternalSignal
      ? undefined
      : setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

    try {
      return await fetch(url, {
        ...options,
        headers: { Accept: 'application/json', ...(options?.headers || {}) },
        signal: hasExternalSignal ? options.signal : controller.signal,
      });
    } finally {
      if (!hasExternalSignal) clearTimeout(timeoutId);
    }
  };

  const fallbackUrl = typeof window === 'undefined' ? resolveServerGetFallbackUrl(path) : null;
  let res: Response;
  try {
    res = await request(apiUrl(path));
  } catch (error) {
    if (!fallbackUrl || options?.signal?.aborted) throw error;
    res = await request(fallbackUrl);
  }

  if (!res.ok && fallbackUrl) {
    res = await request(fallbackUrl);
  }

  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
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

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function normalizePaginatedResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as Record<string, unknown>).results)
  ) {
    return ((data as Record<string, unknown>).results as T[]) ?? [];
  }
  return [];
}

export async function getList<T>(path: string, options?: RequestInit): Promise<T[]> {
  const data = await get<T[] | PaginatedResponse<T>>(path, options);
  return normalizePaginatedResponse<T>(data);
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
  category?: string | null;
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

export type QuoteItem = {
  id: number;
  product?: number;
  product_slug?: string;
  product_name?: string;
  product_variant?: number;
  variant_name?: string;
  description: string;
  quantity: number;
  size?: string;
  material?: string;
  colors?: string;
  needs_design?: boolean;
  artwork_file?: string;
  notes?: string;
  unit_price?: number;
  position?: number;
  created_at?: string;
};

export type Quote = {
  id: number;
  reference: string;
  user?: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  status: string;
  status_display?: string;
  urgency?: string;
  urgency_display?: string;
  notes?: string;
  internal_notes?: string;
  estimated_price?: number;
  final_price?: number;
  price_approved_at?: string | null;
  price_approved_by_name?: string | null;
  price_approval_comment?: string;
  items: QuoteItem[];
  item_count?: number;
  order_reference?: string | null;
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

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'mpesa'
  | 'emola'
  | 'other';

export type Payment = {
  id: number;
  order: number;
  amount: number;
  method: PaymentMethod;
  method_display?: string;
  provider?: 'manual' | 'mock' | 'mpesa' | 'emola';
  provider_display?: string;
  provider_transaction_id?: string;
  correlation_id?: string;
  phone_number?: string;
  reference_code?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  status_display?: string;
  provider_payload?: Record<string, unknown>;
  recorded_by?: number | null;
  recorded_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export type OrderItem = {
  id: number;
  product?: number;
  product_slug?: string;
  product_name?: string;
  product_variant?: number;
  variant_name?: string;
  description: string;
  quantity: number;
  size?: string;
  material?: string;
  colors?: string;
  needs_design?: boolean;
  artwork_file?: string;
  notes?: string;
  unit_price?: number;
  position?: number;
  created_at?: string;
};

export type Order = {
  id: number;
  reference: string;
  quote?: number | null;
  quote_reference?: string;
  user?: number;
  user_email?: string;
  user_name?: string;
  profile?: UserProfile;
  estimated_price?: number;
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
  items: OrderItem[];
  payments?: Payment[];
  item_count?: number;
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

export type CartItem = {
  id: number;
  product: number;
  product_slug?: string;
  product_name?: string;
  product_image?: string;
  product_variant?: number;
  variant_name?: string;
  description: string;
  quantity: number;
  size?: string;
  material?: string;
  colors?: string;
  needs_design?: boolean;
  artwork_file?: string;
  notes?: string;
  position?: number;
  created_at?: string;
};

export type Cart = {
  id: number;
  user: number;
  items: CartItem[];
  item_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type User = {
  id: number;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string | null;
  order_count?: number;
  quote_count?: number;
  profile?: UserProfile;
};
