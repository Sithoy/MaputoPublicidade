export const companyProfile = {
  legalName:
    process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME ||
    'Maputo Publicidade & Serviços, Lda',
  nuit: process.env.NEXT_PUBLIC_COMPANY_NUIT || '400558272',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    'Rua da Resistência N.º 1550, R/C, Maputo, Moçambique',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@maputopublicidade.com',
  phone:
    process.env.NEXT_PUBLIC_COMPANY_PHONE ||
    '+258 21 41 66 03 · +258 82 55 55 736 · +258 84 74 12 838',
  bankName: process.env.NEXT_PUBLIC_COMPANY_BANK_NAME || 'BCI',
  bankAccount:
    process.env.NEXT_PUBLIC_COMPANY_BANK_ACCOUNT || '10 83 25 624 10001',
  bankNib:
    process.env.NEXT_PUBLIC_COMPANY_BANK_NIB || '0008 00000 8325 624 10195',
};
