export const companyProfile = {
  legalName:
    process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME ||
    'Maputo Publicidade e Serviços, Lda',
  nuit: process.env.NEXT_PUBLIC_COMPANY_NUIT || '',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Maputo, Moçambique',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@maputopublicidade.com',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
};
