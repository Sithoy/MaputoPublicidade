// Test accounts are only available when explicitly enabled via environment
// variables. Credentials are never hardcoded here so they cannot leak into
// the repo or a production bundle.

export type TestRole = 'admin' | 'client';

export interface TestAccount {
  role: TestRole;
  label: string;
  email: string;
  password: string;
}

export const ENABLE_TEST_CREDENTIALS =
  process.env.NEXT_PUBLIC_ENABLE_TEST_CREDENTIALS === 'true';

function fromEnv(
  role: TestRole,
  label: string,
  email: string | undefined,
  password: string | undefined
): TestAccount | null {
  if (!email || !password) return null;
  return { role, label, email, password };
}

export const TEST_ACCOUNTS: TestAccount[] = ENABLE_TEST_CREDENTIALS
  ? [
      fromEnv(
        'admin',
        'Administrador',
        process.env.NEXT_PUBLIC_TEST_ADMIN_EMAIL,
        process.env.NEXT_PUBLIC_TEST_ADMIN_PASSWORD
      ),
      fromEnv(
        'client',
        'Cliente',
        process.env.NEXT_PUBLIC_TEST_CLIENT_EMAIL,
        process.env.NEXT_PUBLIC_TEST_CLIENT_PASSWORD
      ),
    ].filter((account): account is TestAccount => account !== null)
  : [];
