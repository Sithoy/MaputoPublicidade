import type { User } from './api';

export type StaffRole =
  | 'owner'
  | 'administrator'
  | 'commercial'
  | 'production'
  | 'finance'
  | 'content'
  | 'receptionist'
  | 'client';

export type StaffCapability =
  | 'intake.create'
  | 'dashboard.view'
  | 'quotes.view'
  | 'quotes.manage'
  | 'quotes.artwork'
  | 'quotes.export'
  | 'orders.view'
  | 'orders.manage'
  | 'orders.manage_status'
  | 'orders.export'
  | 'payments.view'
  | 'payments.manage'
  | 'invoices.view'
  | 'invoices.manage'
  | 'invoices.export'
  | 'catalog.manage'
  | 'content.manage'
  | 'users.manage'
  | 'staff.manage';

export const STAFF_ROLE_OPTIONS: { value: Exclude<StaffRole, 'owner' | 'client'>; label: string }[] = [
  { value: 'administrator', label: 'Administrador' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'production', label: 'Produção' },
  { value: 'finance', label: 'Finanças' },
  { value: 'content', label: 'Conteúdo' },
  { value: 'receptionist', label: 'Recepção' },
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Proprietário',
  administrator: 'Administrador',
  commercial: 'Comercial',
  production: 'Produção',
  finance: 'Finanças',
  content: 'Conteúdo',
  receptionist: 'Recepção',
  client: 'Cliente',
};

export function hasCapability(user: User | null | undefined, capability: StaffCapability) {
  if (!user?.is_staff) return false;
  if (user.is_superuser) return true;
  return Boolean(user.capabilities?.includes(capability));
}

export function getRoleLabel(user: User | null | undefined) {
  if (user?.role_display) return user.role_display;
  const role = user?.role as StaffRole | undefined;
  if (role && ROLE_LABELS[role]) return ROLE_LABELS[role];
  if (user?.is_superuser) return ROLE_LABELS.owner;
  if (user?.is_staff) return ROLE_LABELS.administrator;
  return ROLE_LABELS.client;
}

export function getDefaultAdminPath(user: User | null | undefined) {
  if (hasCapability(user, 'dashboard.view')) return '/admin';
  if (hasCapability(user, 'intake.create')) return '/admin/atendimento/novo';
  if (hasCapability(user, 'orders.view')) return '/admin/encomendas';
  if (hasCapability(user, 'quotes.view')) return '/admin/orcamentos';
  if (hasCapability(user, 'invoices.view')) return '/admin/faturas';
  if (hasCapability(user, 'catalog.manage')) return '/admin/produtos';
  if (hasCapability(user, 'content.manage')) return '/admin/portfolio';
  if (hasCapability(user, 'users.manage')) return '/admin/utilizadores';
  return '/';
}

export function getRequiredCapability(pathname: string): StaffCapability | null {
  if (pathname === '/admin/login') return null;
  if (pathname.startsWith('/admin/atendimento')) return 'intake.create';
  if (pathname === '/admin') return 'dashboard.view';
  if (pathname.startsWith('/admin/quadro')) return 'quotes.view';
  if (pathname.startsWith('/admin/orcamentos')) return 'quotes.view';
  if (pathname.startsWith('/admin/encomendas')) return 'orders.view';
  if (pathname.startsWith('/admin/faturas')) return 'invoices.view';
  if (
    pathname.startsWith('/admin/produtos') ||
    pathname.startsWith('/admin/categorias') ||
    pathname.startsWith('/admin/pacotes')
  ) {
    return 'catalog.manage';
  }
  if (
    pathname.startsWith('/admin/portfolio') ||
    pathname.startsWith('/admin/parceiros')
  ) {
    return 'content.manage';
  }
  if (pathname.startsWith('/admin/utilizadores')) return 'users.manage';
  return 'dashboard.view';
}
