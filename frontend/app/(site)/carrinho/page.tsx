'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getCart, removeCartItem, updateCartItem } from '@/lib/client-api';
import { getToken } from '@/lib/auth';
import type { Cart, CartItem } from '@/lib/api';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    loadCart();
  }, []);

  async function loadCart() {
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function changeQuantity(item: CartItem, delta: number) {
    const next = Math.max(1, item.quantity + delta);
    await updateCartItem(item.id, { quantity: next });
    await loadCart();
  }

  async function remove(item: CartItem) {
    await removeCartItem(item.id);
    await loadCart();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-gray-500">A carregar carrinho...</p>
      </div>
    );
  }

  if (!getToken()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-dark">Carrinho</h1>
        <p className="mt-2 text-gray-600">Inicie sessão para aceder ao seu carrinho.</p>
        <Link href="/area-cliente/login" className="mt-4 inline-block">
          <Button>Iniciar sessão</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      <h1 className="text-3xl font-bold text-dark">Carrinho</h1>
      <p className="mt-1 text-gray-600">Revise os itens antes de pedir o orçamento.</p>

      {!cart || cart.items.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-16 text-center text-gray-500">
            O seu carrinho está vazio.
            <div className="mt-4">
              <Link href="/catalogo">
                <Button>Ver catálogo</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cart.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex gap-4 p-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <Image
                      src={item.product_image || '/images/screen-printing.jpg'}
                      alt={item.product_name || 'Produto'}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-dark">{item.description}</p>
                    <p className="text-sm text-gray-500">{item.product_name}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                      {item.size && <span>Tamanho: {item.size}</span>}
                      {item.material && <span>Material: {item.material}</span>}
                      {item.colors && <span>Cores: {item.colors}</span>}
                    </div>
                    {item.notes && <p className="mt-1 text-xs text-gray-500">{item.notes}</p>}
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => changeQuantity(item, -1)}
                        className="rounded-md border border-gray-300 p-1 hover:bg-gray-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item, 1)}
                        className="rounded-md border border-gray-300 p-1 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="ml-auto text-red-600 hover:text-red-700"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-semibold text-dark">Resumo</h2>
                <p className="text-sm text-gray-600">
                  Total de itens: <span className="font-medium text-dark">{cart.item_count}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Os preços serão calculados pela equipa após submeter o pedido.
                </p>
                <Button
                  onClick={() => router.push('/orcamento')}
                  className="w-full"
                  disabled={cart.items.length === 0}
                >
                  Pedir orçamento
                </Button>
                <Link href="/catalogo">
                  <Button variant="outline" className="w-full">
                    Continuar a comprar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
