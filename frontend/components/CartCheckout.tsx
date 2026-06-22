'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { clearCart, createQuoteFromCart, getCart, getMe } from '@/lib/client-api';
import type { Cart, User } from '@/lib/api';

export function CartCheckout() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ reference: string; estimated_price?: number } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([getCart(), getMe()])
      .then(([cartData, me]) => {
        setCart(cartData);
        setEmail(me.email || '');
        setName(me.first_name ? `${me.first_name} ${me.last_name || ''}`.trim() : '');
        setPhone(me.profile?.phone || '');
        setCompany(me.profile?.company || '');
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart || cart.items.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const quote = await createQuoteFromCart(cart, {
        client_name: name,
        client_email: email,
        client_phone: phone,
        client_company: company,
        urgency,
        notes,
      });
      setResult({ reference: quote.reference, estimated_price: quote.estimated_price });
      await clearCart();
      setCart((prev) => (prev ? { ...prev, items: [], item_count: 0 } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar pedido');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500">A carregar...</div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-lg border border-brand/30 bg-brand/10 p-6">
          <p className="text-lg font-semibold text-brand">Pedido enviado com sucesso!</p>
          <p className="mt-2 text-dark">Referência: {result.reference}</p>
          {result.estimated_price && (
            <p className="text-dark">Estimativa: {result.estimated_price.toLocaleString()} MZN</p>
          )}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => router.push('/area-cliente')}>Ver os meus orçamentos</Button>
          <Button variant="outline" onClick={() => router.push('/catalogo')}>Continuar a comprar</Button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Pedir Orçamento</h2>
          <p className="mt-3 text-gray-600">Confirme os itens do carrinho e os seus dados de contacto.</p>
        </div>

        {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cart?.items.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  O carrinho está vazio.
                </CardContent>
              </Card>
            ) : (
              cart?.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                      <Image
                        src={item.product_image || '/images/screen-printing.jpg'}
                        alt={item.product_name || 'Produto'}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">{item.description}</p>
                      <p className="text-sm text-gray-500">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Quantidade: {item.quantity}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div>
            <Card>
              <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome completo *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="urgency">Urgência</Label>
                    <Select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} className="mt-1">
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgente</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Observações gerais</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                  <Button type="submit" disabled={submitting || !cart?.items.length} className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? 'A enviar...' : 'Enviar pedido de orçamento'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
