import type { Partner } from './api';

export type FallbackPartner = Pick<Partner, 'id' | 'name' | 'slug' | 'sector' | 'logo' | 'website' | 'is_active'> & {
  name: string;
  sector: string;
};

export const partners: FallbackPartner[] = [
  { id: 1, name: 'Parceiro 01', slug: 'parceiro-01', sector: 'Institucional', is_active: true },
  { id: 2, name: 'Parceiro 02', slug: 'parceiro-02', sector: 'Retalho', is_active: true },
  { id: 3, name: 'Parceiro 03', slug: 'parceiro-03', sector: 'Eventos', is_active: true },
  { id: 4, name: 'Parceiro 04', slug: 'parceiro-04', sector: 'Educacao', is_active: true },
  { id: 5, name: 'Parceiro 05', slug: 'parceiro-05', sector: 'Hotelaria', is_active: true },
  { id: 6, name: 'Parceiro 06', slug: 'parceiro-06', sector: 'Construcao', is_active: true },
  { id: 7, name: 'Parceiro 07', slug: 'parceiro-07', sector: 'Tecnologia', is_active: true },
  { id: 8, name: 'Parceiro 08', slug: 'parceiro-08', sector: 'Servicos', is_active: true },
];
