'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { prepareProposal, type ProposalPreparation } from '@/lib/admin-api';

export function ProposalAssistant({ onApply }: { onApply: (preparation: ProposalPreparation) => void }) {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('email');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProposalPreparation | null>(null);
  const [applied, setApplied] = useState(false);

  function clearResult() {
    setResult(null);
    setApplied(false);
    setError('');
  }

  async function prepare() {
    setError('');
    if (files.length > 5 || files.some((file) => file.size > 2 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024) {
      setError('Use até 5 anexos, 2 MB por ficheiro e 3 MB no total.');
      return;
    }
    setBusy(true);
    setResult(null);
    setApplied(false);
    try {
      setResult(await prepareProposal(text, channel, files));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('503')
        ? 'O assistente está indisponível ou ainda não foi activado no backend. Pode continuar com o formulário manual.'
        : message.includes('422') ? 'O pedido excede 50 itens. Divida-o em pedidos menores para evitar omissões.'
        : message.includes('429') ? 'Limite de pedidos atingido. Aguarde um minuto.'
        : 'Não foi possível ler o pedido. Verifique os formatos e limites dos anexos, ou use o formulário manual.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-dark">Preparar proposta com IA</h2>
            <p className="text-sm text-gray-500">Transforme mensagens e anexos em itens organizados. Nada é enviado ou aprovado automaticamente.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="proposal-source">Origem do pedido</Label>
            <Select id="proposal-source" value={channel} disabled={busy} onChange={(event) => { setChannel(event.target.value); clearResult(); }} className="mt-1">
              <option value="email">E-mail</option><option value="whatsapp">WhatsApp</option>
              <option value="phone">Chamada</option><option value="walk_in">Atendimento presencial</option><option value="other">Outra origem</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="proposal-files">Anexos do cliente</Label>
            <input id="proposal-files" type="file" multiple disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xlsx" className="mt-2 block w-full text-sm" onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); clearResult(); }} />
            <p className="mt-1 text-xs text-gray-500">PDF, imagens, TXT, CSV ou Excel XLSX. Até 5 ficheiros, 2 MB cada, 3 MB no total.</p>
          </div>
        </div>
        <div>
          <Label htmlFor="proposal-message">Mensagem ou transcrição</Label>
          <Textarea id="proposal-message" value={text} disabled={busy} maxLength={20000} rows={5} placeholder="Cole aqui o e-mail, a conversa de WhatsApp ou as notas do atendimento…" onChange={(event) => { setText(event.target.value); clearResult(); }} className="mt-1" />
        </div>
        <p className="text-xs text-gray-500">As fontes serão processadas pelo serviço de IA e guardadas de forma privada para conferência. Envie apenas dados necessários ao pedido. Excel: até 500 linhas e 30 colunas; fórmulas devem ter resultados guardados.</p>
        <Button type="button" variant="outline" disabled={busy || (!text.trim() && files.length === 0)} onClick={prepare} className="gap-2">
          <Sparkles className="h-4 w-4" />{busy ? 'A organizar o pedido…' : 'Organizar pedido'}
        </Button>
        <div aria-live="polite">
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {result ? (
            <div className="space-y-4 rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <h3 className="font-semibold text-dark">Rascunho para conferência</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.draft.summary}</p>
              {result.draft.requested_deadline ? <p className="text-sm">Prazo solicitado: {result.draft.requested_deadline} — confirme a viabilidade com produção.</p> : null}
              <ol className="space-y-3">
                {result.draft.items.map((item, index) => (
                  <li key={index} className="rounded-lg bg-white p-3 text-sm">
                    <p className="font-medium">{index + 1}. {item.description} · {item.quantity ?? 'Quantidade por confirmar'}</p>
                    <p className="whitespace-pre-wrap text-gray-600">{item.specifications}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500">Fonte: {item.source || 'Conferir nos originais'}</p>
                  </li>
                ))}
              </ol>
              {result.draft.questions.length ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><h4 className="font-semibold">O que falta confirmar</h4><ul className="mt-2 list-disc space-y-1 pl-5">{result.draft.questions.map((question, index) => <li key={index}>{question}</li>)}</ul></div> : null}
              <p className="text-xs text-gray-600">Preços, prazo comercial e pagamento devem ser definidos pela equipa. Aplicar substitui os dados e itens actuais do formulário abaixo.</p>
              <Button type="button" disabled={applied} onClick={() => { onApply(result); setApplied(true); }}>{applied ? 'Rascunho aplicado — reveja o formulário' : 'Aplicar ao formulário'}</Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
