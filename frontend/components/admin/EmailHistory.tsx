'use client';

import { CorrespondenceFilePreview, type CorrespondenceFile } from '@/components/CorrespondenceFiles';

export type EmailHistoryMessage = {
  id: number; body: string; is_staff: boolean; sender_name?: string; email_subject: string; created_at: string; delivery_status: string; files?: CorrespondenceFile[];
  email_headers?: { from?: string; to?: string; cc?: string; has_attachments?: boolean; prepared_by_name?: string; signature?: { staff_name?: string; staff_title?: string; name: string; email: string; phone: string; address: string } };
};

export function EmailHistory({ messages, subject, clientName, address, busy, onLoadFiles }: { messages: EmailHistoryMessage[]; subject: string; clientName: string; address: string; busy: boolean; onLoadFiles: (messageId: number) => void }) {
  return <>{messages.map((message) => {
    const signature = message.email_headers?.signature;
    const sender = message.is_staff ? signature?.staff_name || message.sender_name || 'Atendimento MP' : clientName;
    return <article key={message.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <details open={message.id === messages[0]?.id}>
        <summary className="cursor-pointer break-words text-xs"><span className="font-semibold text-brand-900">{sender}</span><time dateTime={message.created_at} className="ml-3 text-slate-500">{new Date(message.created_at).toLocaleString('pt-MZ', { dateStyle: 'short', timeStyle: 'short' })}</time><span className="ml-3 text-slate-500">{message.email_subject || subject}</span></summary>
        <dl className="mt-4 space-y-1 border-y py-3 text-[11px] text-slate-500">
          <div className="flex gap-1 break-all"><dt>De:</dt><dd>{message.email_headers?.from || (message.is_staff ? 'atendimento@maputopublicidade.com' : address)}</dd></div>
          <div className="flex gap-1 break-all"><dt>Para:</dt><dd>{message.email_headers?.to || (message.is_staff ? address : 'atendimento@maputopublicidade.com')}</dd></div>
          {message.email_headers?.cc && message.email_headers.cc !== 'Not Provided' && <div className="flex gap-1 break-all"><dt>Cc:</dt><dd>{message.email_headers.cc}</dd></div>}
        </dl>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{message.body}</p>
        {signature && <div className="mt-4 border-l-2 border-[#b69a52] pl-3 text-xs leading-6 text-slate-500"><strong className="text-brand-800">{signature.staff_name || 'Equipa de Atendimento'}</strong>{signature.staff_title && <p>{signature.staff_title}</p>}<p>{signature.name}</p><p>{signature.email}</p><p>{signature.phone}</p><p>{signature.address}</p></div>}
        {message.is_staff && <p className="mt-3 text-[11px] text-slate-500">Enviado por {sender}{message.email_headers?.prepared_by_name ? ` · Preparado por ${message.email_headers.prepared_by_name}` : ''}</p>}
        {message.files?.map((file) => <CorrespondenceFilePreview key={file.id} file={file} />)}
        {!message.is_staff && (message.email_headers?.has_attachments || message.body.includes('[Este email contém anexos.')) && <button type="button" disabled={busy} onClick={() => onLoadFiles(message.id)} className="mt-3 text-xs font-semibold text-brand-800 underline">Carregar anexos deste email</button>}
        {message.delivery_status === 'unconfirmed' || message.delivery_status === 'failed' ? <p className="mt-3 text-xs text-amber-800">{message.delivery_status === 'failed' ? 'Envio registado como não efetuado após verificação.' : 'Envio não confirmado — verifique no Zoho antes de repetir.'}</p> : message.delivery_status === 'accepted' ? <p className="mt-3 text-xs text-brand-700">Aceite para envio pelo Zoho.</p> : null}
      </details>
    </article>;
  })}</>;
}
