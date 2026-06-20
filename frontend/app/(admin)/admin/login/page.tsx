'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TestCredentialsButton } from '@/components/TestCredentialsButton';
import { getToken, login } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const payload = token.split('.')[1];
    if (!payload) return;
    try {
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (claims.is_staff) router.replace('/admin');
      else router.replace('/area-cliente');
    } catch {
      // ignore, stay on login
    }
  }, [router]);

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
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      const token = getToken();
      if (!token) throw new Error('Token não recebido');
      const payload = token.split('.')[1];
      if (!payload) throw new Error('Token inválido');
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (!claims.is_staff) {
        setError('Esta conta não tem permissões de administrador.');
        setLoading(false);
        return;
      }
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-dark">Administração</h1>
            <p className="text-sm text-gray-500">Maputo Publicidade</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
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
                  required
                  className="pl-10"
                  placeholder="admin@maputopublicidade.co.mz"
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
                  type="password"
                  ref={passwordRef}
                  required
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            <TestCredentialsButton currentPage="admin" />
            <p className="text-center text-xs text-gray-400">
              Dados de teste — remover antes de colocar em produção.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
