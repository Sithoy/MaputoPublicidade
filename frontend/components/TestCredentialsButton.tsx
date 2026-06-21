'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

import { ENABLE_TEST_CREDENTIALS, TEST_ACCOUNTS, type TestRole } from '@/lib/test-accounts';
import { login } from '@/lib/auth';

interface Props {
  currentPage: 'admin' | 'client';
}

export function TestCredentialsButton({ currentPage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingRole, setLoadingRole] = useState<TestRole | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!ENABLE_TEST_CREDENTIALS) return null;

  async function enterAs(role: TestRole) {
    const account = TEST_ACCOUNTS[role];
    const target = role === 'admin' ? '/admin' : '/area-cliente';
    setLoadingRole(role);
    setMessage(null);

    try {
      const data = await login(account.email, account.password);
      const user = data.data?.user;
      const hasExpectedRole = role === 'admin' ? user?.is_staff : !user?.is_staff;

      if (!hasExpectedRole) {
        throw new Error('Conta encontrada, mas com permissao diferente da esperada.');
      }

      setMessage({ type: 'success', text: `Credenciais de ${account.label.toLowerCase()} validadas.` });
      setOpen(false);
      router.push(target);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Credenciais de teste invalidas.',
      });
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-brand/30 bg-brand/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-left text-sm font-medium text-dark shadow-sm transition hover:bg-gray-50"
        aria-expanded={open}
      >
        <span>
          Entrar com conta de teste
          <span className="block text-xs font-normal text-gray-500">
            Ambiente de staging
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 grid gap-2">
          {(Object.keys(TEST_ACCOUNTS) as TestRole[]).map((role) => {
            const account = TEST_ACCOUNTS[role];
            const isLoading = loadingRole === role;
            const isCurrentPage = role === currentPage;

            return (
              <button
                key={role}
                type="button"
                onClick={() => enterAs(role)}
                disabled={loadingRole !== null}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-brand hover:bg-white disabled:cursor-wait disabled:opacity-70"
              >
                <span>
                  <span className="block text-sm font-semibold text-dark">{account.label}</span>
                  <span className="block text-xs text-gray-500">{account.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-brand">
                  {isCurrentPage ? 'Atual' : 'Abrir'}
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {message && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
