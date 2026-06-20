'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TEST_ACCOUNTS, type TestRole } from '@/lib/test-accounts';

export function TestCredentialsButton({
  currentPage,
}: {
  currentPage: 'admin' | 'client';
}) {
  const router = useRouter();
  const [role, setRole] = useState<TestRole>(currentPage);

  function apply() {
    const account = TEST_ACCOUNTS[role];
    if (role === currentPage) {
      const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
      const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
      if (emailInput) emailInput.value = account.email;
      if (passwordInput) passwordInput.value = account.password;
    } else {
      const path = role === 'admin' ? '/admin/login' : '/area-cliente/login';
      const params = new URLSearchParams({
        email: account.email,
        password: account.password,
      });
      router.push(`${path}?${params.toString()}`);
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={role}
        onChange={(e) => setRole(e.target.value as TestRole)}
        className="w-full"
      >
        <option value="admin">{TEST_ACCOUNTS.admin.label}</option>
        <option value="client">{TEST_ACCOUNTS.client.label}</option>
      </Select>
      <Button
        type="button"
        variant="outline"
        onClick={apply}
        className="w-full gap-2"
      >
        <Wand2 className="h-4 w-4" />
        Preencher dados de teste
      </Button>
    </div>
  );
}
