import { fetchWithAuth } from './auth';
import type { Cart, CartItem, Order, Payment, Quote, User, UserProfile } from './api';

function emitCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cart-updated'));
  }
}

const MAX_PAGES = 100; // safety bound against malformed `next` links

/** Fetch every page of a paginated endpoint (authenticated). */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const collected: T[] = [];
  let next: string | null = path;
  let pages = 0;
  while (next && pages < MAX_PAGES) {
    const data = await fetchWithAuth(next);
    if (Array.isArray(data)) return collected.concat(data as T[]);
    collected.push(...((data.results as T[]) ?? []));
    next = (data.next as string | null) ?? null;
    pages += 1;
  }
  return collected;
}

export async function getMe(): Promise<User> {
  return fetchWithAuth('/api/auth/me/') as Promise<User>;
}

export type ProfileUpdateData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  profile?: UserProfile;
};

export async function updateMe(data: ProfileUpdateData): Promise<User> {
  return fetchWithAuth('/api/auth/me/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<User>;
}

export async function getCart(): Promise<Cart> {
  return fetchWithAuth('/api/cart/') as Promise<Cart>;
}

export type CartItemData = {
  product_slug: string;
  product_variant_id?: number | null;
  description?: string;
  quantity?: number;
  size?: string;
  material?: string;
  colors?: string;
  needs_design?: boolean;
  artwork_file?: File | null;
  notes?: string;
};

export async function addCartItem(data: CartItemData): Promise<CartItem> {
  const formData = new FormData();
  formData.append('product_slug', data.product_slug);
  if (data.product_variant_id) formData.append('product_variant_id', String(data.product_variant_id));
  if (data.description) formData.append('description', data.description);
  if (data.quantity != null) formData.append('quantity', String(data.quantity));
  if (data.size) formData.append('size', data.size);
  if (data.material) formData.append('material', data.material);
  if (data.colors) formData.append('colors', data.colors);
  if (data.needs_design != null) formData.append('needs_design', String(data.needs_design));
  if (data.artwork_file) formData.append('artwork_file', data.artwork_file);
  if (data.notes) formData.append('notes', data.notes);

  const item = await fetchWithAuth('/api/cart/items/', {
    method: 'POST',
    body: formData,
  }) as CartItem;
  emitCartUpdate();
  return item;
}

export async function updateCartItem(id: number, data: Partial<CartItemData>): Promise<CartItem> {
  const formData = new FormData();
  if (data.product_variant_id !== undefined) formData.append('product_variant_id', String(data.product_variant_id));
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.quantity !== undefined) formData.append('quantity', String(data.quantity));
  if (data.size !== undefined) formData.append('size', data.size);
  if (data.material !== undefined) formData.append('material', data.material);
  if (data.colors !== undefined) formData.append('colors', data.colors);
  if (data.needs_design !== undefined) formData.append('needs_design', String(data.needs_design));
  if (data.artwork_file) formData.append('artwork_file', data.artwork_file);
  if (data.notes !== undefined) formData.append('notes', data.notes);

  const item = await fetchWithAuth(`/api/cart/items/${id}/`, {
    method: 'PATCH',
    body: formData,
  }) as CartItem;
  emitCartUpdate();
  return item;
}

export async function removeCartItem(id: number) {
  await fetchWithAuth(`/api/cart/items/${id}/`, { method: 'DELETE' });
  emitCartUpdate();
}

export async function clearCart(): Promise<Cart> {
  const cart = await fetchWithAuth('/api/cart/', { method: 'POST' }) as Cart;
  emitCartUpdate();
  return cart;
}

export async function createQuoteFromCart(_cart: Cart, contact: {
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  urgency?: string;
  notes?: string;
}): Promise<Quote> {
  return fetchWithAuth('/api/cart/convert-to-quote/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  }) as Promise<Quote>;
}

export async function getClientOrders(): Promise<Order[]> {
  return fetchAllPages<Order>('/api/orders/');
}

export async function getClientQuotes(): Promise<Quote[]> {
  return fetchAllPages<Quote>('/api/quotes/');
}

export async function getClientQuote(reference: string): Promise<Quote> {
  return fetchWithAuth(`/api/quotes/${reference}/`) as Promise<Quote>;
}

export async function getClientOrder(reference: string): Promise<Order> {
  return fetchWithAuth(`/api/orders/${reference}/`) as Promise<Order>;
}

export async function getOrderPayments(reference: string): Promise<Payment[]> {
  return fetchAllPages<Payment>(`/api/orders/${reference}/payments/`);
}

export type PaymentData = {
  amount: number;
  method?: string;
  reference_code?: string;
  status?: string;
  notes?: string;
};

export async function createOrderPayment(reference: string, data: PaymentData): Promise<Payment> {
  return fetchWithAuth(`/api/orders/${reference}/payments/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<Payment>;
}

export type PaymentInitiateData = {
  order_reference: string;
  method: 'mpesa' | 'emola';
  phone_number: string;
  amount?: number;
};

export type PaymentInitiateResponse = {
  provider_response: Record<string, unknown>;
  payment: Payment;
};

export async function initiatePayment(data: PaymentInitiateData): Promise<PaymentInitiateResponse> {
  return fetchWithAuth('/api/payments/initiate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<PaymentInitiateResponse>;
}

export async function approveQuotePrice(reference: string, comment?: string) {
  return fetchWithAuth(`/api/quotes/${reference}/approve-price/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: comment || '' }),
  });
}

export async function approveArtwork(reference: string, comment?: string) {
  return fetchWithAuth(`/api/quotes/${reference}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: comment || '' }),
  });
}

export async function requestArtworkChange(reference: string, comment: string) {
  return fetchWithAuth(`/api/quotes/${reference}/request-change/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
}
