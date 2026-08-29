import { getToken, downloadWithAuth } from './auth';
import { del, get, getAllPages, patch, post, put } from './api';
import type { Category, ClientOption, Invoice, InvoiceStatus, Order, Package, PaginatedResponse, Partner, Payment, PortfolioItem, Product, ProductVariant, Quote, User } from './api';

export type DashboardStats = {
  quotes: {
    total: number;
    by_status: Record<string, number>;
    new: number;
    awaiting_approval: number;
    pending: number;
    last_30_days: number;
  };
  orders: {
    total: number;
    by_status: Record<string, number>;
    by_payment_status: Record<string, number>;
    pending: number;
    last_30_days: number;
    amount_paid_sum: number;
    amount_due_sum: number;
  };
  revenue: {
    estimated_total: number;
    final_total: number;
    estimated_last_30_days: number;
    paid_total: number;
  };
  conversion_rate: number;
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
  recent_activity: {
    type: 'quote' | 'order';
    reference: string;
    status: string;
    client: string;
    created_at: string;
  }[];
  quotes_trend: { date: string; count: number }[];
  orders_trend: { date: string; count: number }[];
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
  staff_role?: 'administrator' | 'commercial' | 'production' | 'finance' | 'content' | 'receptionist' | '';
  is_active?: boolean;
  password?: string;
  password_confirm?: string;
  profile?: {
    company?: string;
    phone?: string;
    nuit?: string;
    address?: string;
    billing_address?: string;
  };
};

export type UserSummary = {
  total: number;
  active: number;
  inactive: number;
  staff: number;
  clients: number;
  roles?: Record<string, number>;
};

export type AdminPasswordResetData = {
  new_password: string;
  confirm_password: string;
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStats(): Promise<DashboardStats> {
  return get<DashboardStats>('/api/admin/stats/', { headers: authHeaders() });
}

export async function getQuotes(params: string = ''): Promise<Quote[]> {
  return getAllPages<Quote>(`/api/quotes/${params}`, { headers: authHeaders() });
}

export async function getQuote(reference: string): Promise<AdminQuote> {
  return get<AdminQuote>(`/api/quotes/${reference}/`, { headers: authHeaders() });
}

export type DocumentLineInput = {
  product_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  notes?: string;
};

export type ManualQuoteInput = {
  user_id?: number | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  urgency?: 'normal' | 'urgent';
  notes?: string;
  internal_notes?: string;
  estimated_delivery_days: number;
  payment_option: 'deposit_50' | 'on_delivery';
  items: DocumentLineInput[];
};

export type ReceptionIntakeInput = {
  user_id?: number | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  contact_source: 'walk_in' | 'phone' | 'whatsapp' | 'email';
  outcome: 'quote' | 'confirmed_order';
  urgency: 'normal' | 'urgent';
  estimated_delivery_days?: number | null;
  payment_option: 'deposit_50' | 'on_delivery';
  delivery_method: 'pickup' | 'delivery';
  delivery_address?: string;
  notes?: string;
  internal_notes?: string;
  items: Array<{
    product_id?: number;
    description: string;
    quantity: number;
    unit_price?: number | null;
    notes?: string;
  }>;
};

export type ReceptionIntakeResult = {
  outcome: 'quote' | 'confirmed_order';
  quote_reference: string;
  order_reference: string | null;
  quote: Quote;
};

export async function createManualQuote(data: ManualQuoteInput): Promise<Quote> {
  return post<Quote>('/api/quotes/manual/', data, getToken());
}

export async function createReceptionIntake(
  data: ReceptionIntakeInput
): Promise<ReceptionIntakeResult> {
  return post<ReceptionIntakeResult>('/api/quotes/intake/', data, getToken());
}

export async function getClientOptions(): Promise<ClientOption[]> {
  return get<ClientOption[]>('/api/auth/client-options/', { headers: authHeaders() });
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

export async function updateQuoteDocument(
  reference: string,
  data: {
    valid_until?: string | null;
    terms?: string;
    estimated_delivery_days?: number | null;
    payment_option?: 'deposit_50' | 'on_delivery';
  }
) {
  return patch(`/api/quotes/${reference}/`, data, getToken());
}

export async function downloadQuotePdf(reference: string) {
  return downloadWithAuth(`/api/quotes/${reference}/pdf/`, `Proposta-${reference}.pdf`);
}

export async function downloadInvoicePdf(reference: string) {
  return downloadWithAuth(`/api/invoices/${reference}/pdf/`, `Fatura-${reference}.pdf`);
}

export async function uploadArtworkProof(reference: string, formData: FormData) {
  return post(`/api/quotes/${reference}/upload-proof/`, formData, getToken());
}

export async function getProducts(): Promise<Product[]> {
  return getAllPages<Product>('/api/products/', { headers: authHeaders() });
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
  return getAllPages<Category>('/api/categories/', { headers: authHeaders() });
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
  return getAllPages<Package>('/api/packages/', { headers: authHeaders() });
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
  return getAllPages<PortfolioItem>('/api/portfolio/', { headers: authHeaders() });
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
  return getAllPages<Partner>('/api/partners/', { headers: authHeaders() });
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

export async function getUsers(params: string = ''): Promise<PaginatedResponse<User>> {
  return get<PaginatedResponse<User>>(`/api/auth/users/${params}`, { headers: authHeaders() });
}

export async function getUserSummary(): Promise<UserSummary> {
  return get<UserSummary>('/api/auth/users/summary/', { headers: authHeaders() });
}

export async function getUser(id: number): Promise<User> {
  return get<User>(`/api/auth/users/${id}/`, { headers: authHeaders() });
}

export async function updateUser(id: number, data: UserFormData): Promise<User> {
  return patch<User>(`/api/auth/users/${id}/`, data, getToken());
}

export async function createUser(data: UserFormData): Promise<User> {
  return post<User>('/api/auth/users/', data, getToken());
}

export async function setUserPassword(
  id: number,
  data: AdminPasswordResetData
): Promise<{ detail: string }> {
  return post<{ detail: string }>(`/api/auth/users/${id}/set-password/`, data, getToken());
}

export async function toggleUserStaff(id: number) {
  return post(`/api/auth/users/${id}/toggle-staff/`, {}, getToken());
}

export async function toggleUserActive(id: number) {
  return post(`/api/auth/users/${id}/toggle-active/`, {}, getToken());
}

export async function getOrders(params: string = ''): Promise<Order[]> {
  return getAllPages<Order>(`/api/orders/${params}`, { headers: authHeaders() });
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

export async function getOrderPayments(reference: string): Promise<Payment[]> {
  return getAllPages<Payment>(`/api/orders/${reference}/payments/`, { headers: authHeaders() });
}

export type AdminPaymentData = {
  amount: number;
  method?: string;
  reference_code?: string;
  status?: string;
  notes?: string;
};

export async function createOrderPayment(reference: string, data: AdminPaymentData): Promise<Payment> {
  return post<Payment>(`/api/orders/${reference}/payments/`, data, getToken());
}

export async function convertQuoteToOrder(reference: string) {
  return post<{ order_reference: string }>(`/api/quotes/${reference}/convert-to-order/`, {}, getToken());
}

export type InvoiceInput = {
  order_reference?: string | null;
  user_id?: number | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_nuit?: string;
  billing_address?: string;
  issue_date: string;
  due_date: string;
  discount_amount?: number;
  tax_rate?: number;
  notes?: string;
  terms?: string;
  items?: DocumentLineInput[];
};

export async function getInvoices(params: string = ''): Promise<Invoice[]> {
  return getAllPages<Invoice>(`/api/invoices/${params}`, { headers: authHeaders() });
}

export async function getInvoice(reference: string): Promise<Invoice> {
  return get<Invoice>(`/api/invoices/${reference}/`, { headers: authHeaders() });
}

export async function createInvoice(data: InvoiceInput): Promise<Invoice> {
  return post<Invoice>('/api/invoices/', data, getToken());
}

export async function updateInvoice(reference: string, data: Partial<InvoiceInput>): Promise<Invoice> {
  return patch<Invoice>(`/api/invoices/${reference}/`, data, getToken());
}

export async function updateInvoiceStatus(reference: string, status: InvoiceStatus): Promise<Invoice> {
  return post<Invoice>(`/api/invoices/${reference}/set-status/`, { status }, getToken());
}

export function downloadExport(path: string, filename: string) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(`${window.location.origin}${path}`, { headers })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
}

export function exportQuotes(format: 'csv' | 'xlsx', params: Record<string, string> = {}) {
  const query = new URLSearchParams({ format, ...params }).toString();
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  downloadExport(`/api/quotes/export/?${query}`, `orcamentos.${ext}`);
}

export function exportOrders(format: 'csv' | 'xlsx', params: Record<string, string> = {}) {
  const query = new URLSearchParams({ format, ...params }).toString();
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  downloadExport(`/api/orders/export/?${query}`, `encomendas.${ext}`);
}

export function exportInvoices(format: 'csv' | 'xlsx', params: Record<string, string> = {}) {
  const query = new URLSearchParams({ format, ...params }).toString();
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  downloadExport(`/api/invoices/export/?${query}`, `faturas.${ext}`);
}
