import { getToken } from './auth';
import { del, get, patch, post, put } from './api';
import type { Category, Order, Package, Partner, PortfolioItem, Product, ProductVariant, Quote, User } from './api';

export type DashboardStats = {
  quotes: {
    total: number;
    by_status: Record<string, number>;
    pending: number;
    last_30_days: number;
  };
  revenue: {
    estimated_total: number;
    final_total: number;
    estimated_last_30_days: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
  };
  catalog: {
    categories: number;
    packages: number;
  };
  users: {
    total: number;
    staff: number;
    active: number;
    inactive: number;
  };
};

export type AdminQuote = Quote & {
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  urgency?: string;
  urgency_display?: string;
  notes?: string;
  internal_notes?: string;
  updated_at?: string;
  artwork?: ArtworkApproval | null;
  order_reference?: string | null;
};

export type ArtworkApproval = {
  id: number;
  status: string;
  status_display?: string;
  proof_file?: string;
  designer_comment?: string;
  client_comment?: string;
  requested_changes?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductFormData = {
  name: string;
  slug: string;
  category_id?: string;
  description?: string;
  materials?: string;
  sizes?: string;
  min_quantity?: string;
  lead_time?: string;
  base_price?: string;
  pricing_complexity?: 'simple' | 'complex';
  is_featured?: boolean;
  is_active?: boolean;
};

export type CategoryFormData = {
  name: string;
  slug: string;
  icon_name?: string;
  short_description?: string;
  description?: string;
  display_order?: string;
  is_active?: boolean;
};

export type PackageFormData = {
  name: string;
  slug: string;
  description?: string;
  price: string;
  items?: string;
  target_audience?: string;
  is_recurring?: boolean;
  is_active?: boolean;
};

export type UserFormData = {
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_active?: boolean;
  profile?: {
    company?: string;
    phone?: string;
    nuit?: string;
    address?: string;
  };
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStats(): Promise<DashboardStats> {
  return get<DashboardStats>('/api/admin/stats/', { headers: authHeaders() });
}

export async function getQuotes(params: string = ''): Promise<Quote[]> {
  return get<Quote[]>(`/api/quotes/${params}`, { headers: authHeaders() });
}

export async function getQuote(reference: string): Promise<AdminQuote> {
  return get<AdminQuote>(`/api/quotes/${reference}/`, { headers: authHeaders() });
}

export async function updateQuoteStatus(reference: string, status: string) {
  return post(`/api/quotes/${reference}/set-status/`, { status }, getToken());
}

export async function updateQuotePrice(
  reference: string,
  data: { estimated_price?: number | null; final_price?: number | null }
) {
  return post(`/api/quotes/${reference}/set-price/`, data, getToken());
}

export async function updateQuoteInternalNotes(reference: string, internal_notes: string) {
  return patch(`/api/quotes/${reference}/`, { internal_notes }, getToken());
}

export async function uploadArtworkProof(reference: string, formData: FormData) {
  return post(`/api/quotes/${reference}/upload-proof/`, formData, getToken());
}

export async function getProducts(): Promise<Product[]> {
  return get<Product[]>('/api/products/', { headers: authHeaders() });
}

export async function getProduct(slug: string): Promise<Product> {
  return get<Product>(`/api/products/${slug}/`, { headers: authHeaders() });
}

export async function createProduct(formData: FormData): Promise<Product> {
  return post<Product>('/api/products/', formData, getToken());
}

export async function updateProduct(slug: string, formData: FormData): Promise<Product> {
  return patch<Product>(`/api/products/${slug}/`, formData, getToken());
}

export async function deleteProduct(slug: string) {
  return del(`/api/products/${slug}/`, getToken());
}

export async function createVariant(formData: FormData): Promise<ProductVariant> {
  return post<ProductVariant>('/api/variants/', formData, getToken());
}

export async function updateVariant(id: number, formData: FormData): Promise<ProductVariant> {
  return patch<ProductVariant>(`/api/variants/${id}/`, formData, getToken());
}

export async function deleteVariant(id: number) {
  return del(`/api/variants/${id}/`, getToken());
}

export async function getCategories(): Promise<Category[]> {
  return get<Category[]>('/api/categories/', { headers: authHeaders() });
}

export async function createCategory(formData: FormData): Promise<Category> {
  return post<Category>('/api/categories/', formData, getToken());
}

export async function updateCategory(slug: string, formData: FormData): Promise<Category> {
  return patch<Category>(`/api/categories/${slug}/`, formData, getToken());
}

export async function deleteCategory(slug: string) {
  return del(`/api/categories/${slug}/`, getToken());
}

export async function getPackages(): Promise<Package[]> {
  return get<Package[]>('/api/packages/', { headers: authHeaders() });
}

export async function createPackage(formData: FormData): Promise<Package> {
  return post<Package>('/api/packages/', formData, getToken());
}

export async function updatePackage(slug: string, formData: FormData): Promise<Package> {
  return patch<Package>(`/api/packages/${slug}/`, formData, getToken());
}

export async function deletePackage(slug: string) {
  return del(`/api/packages/${slug}/`, getToken());
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  return get<PortfolioItem[]>('/api/portfolio/', { headers: authHeaders() });
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem> {
  return get<PortfolioItem>(`/api/portfolio/${slug}/`, { headers: authHeaders() });
}

export async function createPortfolioItem(formData: FormData): Promise<PortfolioItem> {
  return post<PortfolioItem>('/api/portfolio/', formData, getToken());
}

export async function updatePortfolioItem(slug: string, formData: FormData): Promise<PortfolioItem> {
  return patch<PortfolioItem>(`/api/portfolio/${slug}/`, formData, getToken());
}

export async function deletePortfolioItem(slug: string) {
  return del(`/api/portfolio/${slug}/`, getToken());
}

export async function getPartners(): Promise<Partner[]> {
  return get<Partner[]>('/api/partners/', { headers: authHeaders() });
}

export async function getPartner(slug: string): Promise<Partner> {
  return get<Partner>(`/api/partners/${slug}/`, { headers: authHeaders() });
}

export async function createPartner(formData: FormData): Promise<Partner> {
  return post<Partner>('/api/partners/', formData, getToken());
}

export async function updatePartner(slug: string, formData: FormData): Promise<Partner> {
  return patch<Partner>(`/api/partners/${slug}/`, formData, getToken());
}

export async function deletePartner(slug: string) {
  return del(`/api/partners/${slug}/`, getToken());
}

export async function getUsers(params: string = ''): Promise<User[]> {
  return get<User[]>(`/api/auth/users/${params}`, { headers: authHeaders() });
}

export async function getUser(id: number): Promise<User> {
  return get<User>(`/api/auth/users/${id}/`, { headers: authHeaders() });
}

export async function updateUser(id: number, data: UserFormData): Promise<User> {
  return patch<User>(`/api/auth/users/${id}/`, data, getToken());
}

export async function toggleUserStaff(id: number) {
  return post(`/api/auth/users/${id}/toggle-staff/`, {}, getToken());
}

export async function toggleUserActive(id: number) {
  return post(`/api/auth/users/${id}/toggle-active/`, {}, getToken());
}

export async function getOrders(params: string = ''): Promise<Order[]> {
  return get<Order[]>(`/api/orders/${params}`, { headers: authHeaders() });
}

export async function getOrder(reference: string): Promise<Order> {
  return get<Order>(`/api/orders/${reference}/`, { headers: authHeaders() });
}

export async function updateOrderStatus(reference: string, status: string) {
  return post(`/api/orders/${reference}/set-status/`, { status }, getToken());
}

export async function updateOrderPayment(
  reference: string,
  data: { payment_status: string; amount_paid?: number | null }
) {
  return post(`/api/orders/${reference}/set-payment/`, data, getToken());
}

export async function convertQuoteToOrder(reference: string) {
  return post<{ order_reference: string }>(`/api/quotes/${reference}/convert-to-order/`, {}, getToken());
}
