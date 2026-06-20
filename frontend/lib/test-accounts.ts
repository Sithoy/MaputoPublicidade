export const TEST_ACCOUNTS = {
  admin: {
    label: 'Administrador',
    email: 'admin@maputopublicidade.co.mz',
    password: 'admin12345',
  },
  client: {
    label: 'Cliente',
    email: 'cliente@maputopublicidade.co.mz',
    password: 'cliente12345',
  },
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;
