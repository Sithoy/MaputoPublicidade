import { fetchWithAuth } from './auth';
import type { Order, User, UserProfile } from './api';

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

export async function getClientOrders(): Promise<Order[]> {
  return fetchWithAuth('/api/orders/') as Promise<Order[]>;
}

export async function getClientOrder(reference: string): Promise<Order> {
  return fetchWithAuth(`/api/orders/${reference}/`) as Promise<Order>;
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
