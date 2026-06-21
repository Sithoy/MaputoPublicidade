export const TEST_ACCOUNTS = {
  admin: {
    label: 'Administrador',
    email: 'testadmin@maputopublicidade.co.mz',
    password: 'admin12345',
  },
  client: {
    label: 'Cliente',
    email: 'cliente@maputopublicidade.co.mz',
    password: 'cliente12345',
  },
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;

export const ENABLE_TEST_CREDENTIALS =
  process.env.NEXT_PUBLIC_ENABLE_TEST_CREDENTIALS === 'true';
