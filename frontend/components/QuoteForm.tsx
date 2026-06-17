'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { post } from '@/lib/api';

const products = [
  { slug: 'rollups', name: 'Rollups' },
  { slug: 'camisetas-personalizadas', name: 'Camisetas Personalizadas' },
  { slug: 'cartoes-de-visita', name: 'Cartões de Visita' },
  { slug: 'bones-bordados', name: 'Bonés Bordados' },
  { slug: 'placas-de-identificacao', name: 'Placas de Identificação' },
  { slug: 'autocolantes', name: 'Autocolantes' },
  { slug: 'branding-de-viaturas', name: 'Branding de Viaturas' },
  { slug: 'gazebos-e-stands', name: 'Gazebos e Stands' },
];

const WHATSAPP_NUMBER = '25882555736';

export function QuoteForm() {
  const searchParams = useSearchParams();
  const productParam = searchParams.get('produto');
  const packageParam = searchParams.get('pacote');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; estimated_price?: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productParam) {
      const select = document.getElementById('product') as HTMLSelectElement;
      if (select) {
        const match = products.find((p) => p.slug === productParam);
        select.value = match?.slug || '';
      }
    }
  }, [productParam]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    if (packageParam) formData.append('package', packageParam);

    try {
      const data = await post('/api/quotes/', formData);
      setResult(data as { reference: string; estimated_price?: number });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar pedido');
    } finally {
      setLoading(false);
    }
  }

  const whatsappFallback = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Olá! Gostaria de pedir um orçamento${productParam ? ` para ${productParam}` : ''}.`
  )}`;

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-dark md:text-4xl">Pedir Orçamento</h2>
          <p className="mt-3 text-gray-600">
            Preencha os detalhes e receba uma proposta personalizada em breve.
          </p>
        </div>

        {result && (
          <div className="mb-6 rounded-lg border border-brand/30 bg-brand/10 p-5 text-center">
            <p className="font-semibold text-brand">Pedido enviado com sucesso!</p>
            <p className="text-sm text-dark">Referência: {result.reference}</p>
            {result.estimated_price && (
              <p className="text-sm text-dark">Estimativa: {result.estimated_price.toLocaleString()} MZN</p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input id="phone" name="phone" type="tel" required />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" name="company" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="product">Produto / Serviço *</Label>
              <Select id="product" name="product_slug" defaultValue={productParam || ''} required>
                <option value="" disabled>Selecione...</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input id="quantity" name="quantity" type="number" min={1} />
            </div>
            <div>
              <Label htmlFor="size">Tamanho / Dimensões</Label>
              <Input id="size" name="size" placeholder="Ex: 85x200cm" />
            </div>
            <div>
              <Label htmlFor="material">Material</Label>
              <Input id="material" name="material" placeholder="Ex: PVC, papel 300g" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="colors">Número de cores</Label>
              <Input id="colors" name="colors" type="number" min={1} />
            </div>
            <div>
              <Label htmlFor="urgency">Urgência</Label>
              <Select id="urgency" name="urgency" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="needs_design"
              name="needs_design"
              type="checkbox"
              value="true"
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <Label htmlFor="needs_design" className="mb-0 font-normal text-gray-700">
              Preciso de ajuda com design / arte final
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={4} placeholder="Descreva o projeto, referências ou dúvidas..." />
          </div>

          <div>
            <Label htmlFor="file">Anexar ficheiro (logótipo, imagem ou briefing)</Label>
            <Input id="file" name="file" type="file" accept="image/*,.pdf,.ai,.eps,.cdr" />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              {loading ? 'A enviar...' : 'Enviar pedido de orçamento'}
            </Button>
            <a href={whatsappFallback} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button type="button" variant="accent" className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                Enviar pelo WhatsApp
              </Button>
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}
