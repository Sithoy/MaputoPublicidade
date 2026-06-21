'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { fetchWithAuth, login } from '@/lib/auth';

function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    const password = searchParams.get('password');
    if (emailRef.current && email) emailRef.current.value = email;
    if (passwordRef.current && password) passwordRef.current.value = password;
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    try {
      await login(formData.get('email') as string, formData.get('password') as string);
      const me = await fetchWithAuth('/api/auth/me/');
      if (me.is_staff) {
        router.push('/admin');
      } else {
        router.push('/area-cliente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md items-center px-4 py-16">
      <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-dark">Área do Cliente</h1>
          <p className="mt-1 text-sm text-gray-600">Inicie sessão para ver os seus orçamentos.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                ref={emailRef}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Palavra-passe</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                ref={passwordRef}
                className="pl-9 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Ainda não tem conta? Contacte-nos pelo WhatsApp para ativar a sua área de cliente.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-200px)] items-center justify-center" />}>
      <ClientLoginForm />
    </Suspense>
  );
}
