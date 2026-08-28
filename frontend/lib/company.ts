const defaultPhoneNumbers = [
  '+258 21 41 66 03',
  '+258 82 55 55 736',
  '+258 84 74 12 838',
];

const phone =
  process.env.NEXT_PUBLIC_COMPANY_PHONE || defaultPhoneNumbers.join(' · ');
const phoneNumbers = phone
  .split(/\s*(?:·|\|)\s*/)
  .map((value) => value.trim())
  .filter(Boolean);
const primaryPhone =
  process.env.NEXT_PUBLIC_COMPANY_PRIMARY_PHONE ||
  phoneNumbers.find((value) => value.replace(/\D/g, '').startsWith('25882')) ||
  phoneNumbers[0] ||
  defaultPhoneNumbers[1];
const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || primaryPhone.replace(/\D/g, '');

export const companyProfile = {
  legalName:
    process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME ||
    'Maputo Publicidade & Serviços, Lda',
  displayName: process.env.NEXT_PUBLIC_COMPANY_DISPLAY_NAME || 'Maputo Publicidade',
  nuit: process.env.NEXT_PUBLIC_COMPANY_NUIT || '400558272',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    'Rua da Resistência N.º 1550, R/C, Maputo, Moçambique',
  streetAddress:
    process.env.NEXT_PUBLIC_COMPANY_STREET_ADDRESS ||
    'Rua da Resistência N.º 1550, R/C',
  city: process.env.NEXT_PUBLIC_COMPANY_CITY || 'Maputo',
  countryCode: process.env.NEXT_PUBLIC_COMPANY_COUNTRY_CODE || 'MZ',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@maputopublicidade.com',
  phone,
  phoneNumbers,
  primaryPhone,
  whatsappNumber,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maputopublicidade.com',
  facebookUrl:
    process.env.NEXT_PUBLIC_COMPANY_FACEBOOK_URL ||
    'https://www.facebook.com/maputopublicidade',
  instagramUrl:
    process.env.NEXT_PUBLIC_COMPANY_INSTAGRAM_URL ||
    'https://www.instagram.com/maputopublicidade',
  openingHoursLabel:
    process.env.NEXT_PUBLIC_COMPANY_OPENING_HOURS ||
    'Segunda a Sexta, 08h00–17h00',
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: process.env.NEXT_PUBLIC_COMPANY_OPENS || '08:00',
    closes: process.env.NEXT_PUBLIC_COMPANY_CLOSES || '17:00',
  },
  mapEmbedUrl:
    process.env.NEXT_PUBLIC_COMPANY_MAP_EMBED_URL ||
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.0!2d32.5833!3d-25.9667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDU4JzAwLjEiUyAzMsKwMzUnMDAuMCJF!5e0!3m2!1spt-PT!2smz!4v1600000000000!5m2!1spt-PT!2smz',
  bankName: process.env.NEXT_PUBLIC_COMPANY_BANK_NAME || 'BCI',
  bankAccount:
    process.env.NEXT_PUBLIC_COMPANY_BANK_ACCOUNT || '10 83 25 624 10001',
  bankNib:
    process.env.NEXT_PUBLIC_COMPANY_BANK_NIB || '0008 00000 8325 624 10195',
};

export function telephoneHref(phoneNumber = companyProfile.primaryPhone) {
  return `tel:${phoneNumber.replace(/[^\d+]/g, '')}`;
}

export function mailtoHref(email = companyProfile.email) {
  return `mailto:${email}`;
}

export function whatsappHref(message: string) {
  return `https://wa.me/${companyProfile.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
