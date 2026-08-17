import type { Partner } from './api';

export const partners: Partner[] = [
  { id: 1, name: 'Bayport', slug: 'bayport', sector: 'Serviços financeiros', is_featured: true, is_active: true },
  { id: 5, name: 'Cimentos de Moçambique', slug: 'cimentos-de-mocambique', sector: 'Indústria transformadora', is_active: true },
  { id: 2, name: 'Eletricidade de Moçambique', slug: 'eletricidade-de-mocambique', sector: 'Energia', is_active: true },
  { id: 4, name: 'Emose', slug: 'emose', sector: 'Seguros', is_active: true },
  { id: 7, name: 'IIAM', slug: 'iiam', sector: 'Instituição pública', is_active: true },
  { id: 6, name: 'MAHS', slug: 'mahs', sector: 'Gestão de aeroportos', is_active: true },
  { id: 3, name: 'Petromoc', slug: 'petromoc', sector: 'Petróleo e energia', is_active: true },
  { id: 8, name: 'SMS', slug: 'sms', sector: 'Catering', is_active: true },
  { id: 9, name: 'Tmcel', slug: 'tmcel', sector: 'Tecnologia', is_active: true },
];
