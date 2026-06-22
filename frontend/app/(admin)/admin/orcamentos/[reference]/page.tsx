'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  convertQuoteToOrder,
  getQuote,
  updateQuoteInternalNotes,
  updateQuotePrice,
  updateQuoteStatus,
  uploadArtworkProof,
} from '@/lib/admin-api';
import type { AdminQuote } from '@/lib/admin-api';

const statusOptions = [
  { value: 'received', label: 'Pedido recebido' },
  { value: 'reviewing', label: 'Em análise' },
  { value: 'quoted', label: 'Orçamentado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'in_production', label: 'Em produção' },
  { value: 'ready', label: 'Pronto para entrega' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function AdminOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAdminAuth();
  const [quote, setQuote] = useState<AdminQuote | null>(null);
  const [status, setStatus] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [designerComment, setDesignerComment] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading || !reference) return;
    getQuote(reference)
      .then((data) => {
        setQuote(data);
        setStatus(data.status);
        setEstimatedPrice(data.estimated_price?.toString() || '');
        setFinalPrice(data.final_price?.toString() || '');
        setInternalNotes(data.internal_notes || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar encomenda'));
  }, [authLoading, reference]);

  async function handleStatusUpdate() {
    if (!reference) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await updateQuoteStatus(reference, status);
      setMessage('Estado actualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar estado');
    } finally {
      setLoading(false);
    }
  }

  async function handlePriceUpdate() {
    if (!reference) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await updateQuotePrice(reference, {
        estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
        final_price: finalPrice ? parseFloat(finalPrice) : null,
      });
      setMessage('Preços actualizados com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao actualizar preços');
    } finally {
      setLoading(false);
    }
  }

  async function handleNotesUpdate() {
    if (!reference) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await updateQuoteInternalNotes(reference, internalNotes);
      setMessage('Notas internas guardadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar notas');
    } finally {
      setLoading(false);
    }
  }

  async function handleProofUpload() {
    if (!reference || !proofFile) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('proof_file', proofFile);
      formData.append('designer_comment', designerComment);
      await uploadArtworkProof(reference, formData);
      setMessage('Prova de arte enviada com sucesso.');
      setProofFile(null);
      setDesignerComment('');
      getQuote(reference).then(setQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar prova');
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertToOrder() {
    if (!reference) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await convertQuoteToOrder(reference);
      setMessage(`Encomenda ${result.order_reference} criada com sucesso.`);
      getQuote(reference).then(setQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao converter orçamento');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !quote) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/orcamentos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-dark">{quote.reference}</h1>
          <p className="text-sm text-gray-500">
            {quote.items.length} item(s) • {quote.items[0]?.description || 'Sem descrição'}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-dark">Dados do cliente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-gray-500">Nome</Label>
                <p className="font-medium text-dark">{quote.client_name}</p>
              </div>
              <div>
                <Label className="text-gray-500">E-mail</Label>
                <p className="font-medium text-dark">{quote.client_email}</p>
              </div>
              <div>
                <Label className="text-gray-500">Telefone</Label>
                <p className="font-medium text-dark">{quote.client_phone || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500">Empresa</Label>
                <p className="font-medium text-dark">{quote.client_company || '-'}</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            <h2 className="text-lg font-semibold text-dark">Detalhes do pedido</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-gray-500">
                  <tr>
                    <th className="pb-2 font-medium">Descrição</th>
                    <th className="pb-2 font-medium">Qtd</th>
                    <th className="pb-2 font-medium">Tamanho</th>
                    <th className="pb-2 font-medium">Material</th>
                    <th className="pb-2 font-medium">Cores</th>
                    <th className="pb-2 font-medium">Design</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 font-medium text-dark">{item.description}</td>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3">{item.size || '—'}</td>
                      <td className="py-3">{item.material || '—'}</td>
                      <td className="py-3">{item.colors || '—'}</td>
                      <td className="py-3">{item.needs_design ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {quote.notes && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <Label className="text-gray-500">Observações do cliente</Label>
                  <p className="mt-1 whitespace-pre-wrap text-dark">{quote.notes}</p>
                </div>
              </>
            )}

            {quote.items.some((i) => i.artwork_file) && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <Label className="text-gray-500">Ficheiros de arte</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quote.items
                      .filter((i) => i.artwork_file)
                      .map((item) => (
                        <Link key={item.id} href={item.artwork_file as string} target="_blank" download>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            {item.description}
                          </Button>
                        </Link>
                      ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-dark">Estado</h2>
              <div>
                <Label>Estado actual</Label>
                <div className="mt-1">
                  <StatusBadge status={quote.status} />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Actualizar estado</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleStatusUpdate} disabled={loading} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Guardar estado
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-dark">Preços</h2>
              <div>
                <Label htmlFor="estimated">Preço estimado (MZN)</Label>
                <Input
                  id="estimated"
                  type="number"
                  step="0.01"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="final">Preço final (MZN)</Label>
                <Input
                  id="final"
                  type="number"
                  step="0.01"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handlePriceUpdate} disabled={loading} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Guardar preços
              </Button>
            </CardContent>
          </Card>

          {quote.order_reference ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold text-dark">Encomenda</h2>
                <p className="text-sm text-gray-600">
                  Este orçamento já foi convertido na encomenda{' '}
                  <Link href={`/admin/encomendas/${quote.order_reference}`} className="text-brand hover:underline">
                    {quote.order_reference}
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold text-dark">Converter em encomenda</h2>
                <p className="text-sm text-gray-600">
                  Crie uma encomenda a partir deste orçamento. Recomenda-se definir o preço final antes.
                </p>
                <Button
                  onClick={handleConvertToOrder}
                  disabled={loading || !quote.final_price}
                  className="w-full gap-2"
                >
                  Converter em encomenda
                </Button>
                {!quote.final_price && (
                  <p className="text-xs text-red-600">Defina o preço final primeiro.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-dark">Notas internas</h2>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Anotações visíveis apenas para a equipa..."
            rows={4}
          />
          <Button onClick={handleNotesUpdate} disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar notas
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-dark">Arte-final</h2>
          {quote.artwork?.proof_file && (
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Prova actual</p>
              <Link href={quote.artwork.proof_file} target="_blank" download>
                <Button variant="outline" size="sm" className="mt-2 gap-2">
                  <Download className="h-4 w-4" />
                  Download da prova
                </Button>
              </Link>
              {quote.artwork.designer_comment && (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Comentário:</span>{' '}
                  {quote.artwork.designer_comment}
                </p>
              )}
              <div className="mt-2">
                <Badge variant={quote.artwork.status === 'approved' ? 'default' : 'outline'}>
                  {quote.artwork.status_display || quote.artwork.status}
                </Badge>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="proof">Enviar nova prova</Label>
            <Input
              id="proof"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="designer_comment">Comentário do designer</Label>
            <Textarea
              id="designer_comment"
              value={designerComment}
              onChange={(e) => setDesignerComment(e.target.value)}
              placeholder="Descreva as alterações ou confirmações..."
              rows={3}
              className="mt-1"
            />
          </div>
          <Button onClick={handleProofUpload} disabled={loading || !proofFile} className="gap-2">
            <Upload className="h-4 w-4" />
            Enviar prova
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
