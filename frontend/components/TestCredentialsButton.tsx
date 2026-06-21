'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { ENABLE_TEST_CREDENTIALS, TEST_ACCOUNTS, type TestRole } from '@/lib/test-accounts';

interface Props {
  currentPage: 'admin' | 'client';
}

export function TestCredentialsButton({ currentPage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!ENABLE_TEST_CREDENTIALS) return null;

  function fill(role: TestRole) {
    const account = TEST_ACCOUNTS[role];

    if (role === currentPage) {
      const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
      const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
      if (emailInput) emailInput.value = account.email;
      if (passwordInput) passwordInput.value = account.password;
      setOpen(false);
      return;
    }

    const target = role === 'admin' ? '/admin/login' : '/area-cliente/login';
    router.push(`${target}?email=${encodeURIComponent(account.email)}&password=${encodeURIComponent(account.password)}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
      >
        Preencher credenciais de teste <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => fill('admin')}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            Administrador
          </button>
          <button
            type="button"
            onClick={() => fill('client')}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            Cliente
          </button>
        </div>
      )}
    </div>
  );
}
