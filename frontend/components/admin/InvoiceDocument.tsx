import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, CalendarDays, CircleDollarSign, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Invoice } from '@/lib/api';
import { companyProfile } from '@/lib/company';
import { formatMZN } from '@/lib/utils';

type InvoiceDocumentProps = {
  invoice: Invoice;
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-MZ');
}

function MetaItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3 px-5 py-4 first:pl-0 last:pr-0 sm:border-r sm:border-[#dfe7e1] sm:first:pl-5 sm:last:border-r-0 sm:last:pr-5">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-[0_1px_3px_rgba(23,33,29,0.08)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718078]">{label}</p>
        <div className="mt-1 truncate text-sm font-semibold text-dark">{children}</div>
      </div>
    </div>
  );
}

export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  const hasSupplementaryInformation = Boolean(
    invoice.notes ||
      invoice.terms ||
      companyProfile.bankAccount ||
      companyProfile.bankNib,
  );

  return (
    <article className="invoice-document print-document relative isolate flex min-h-[1080px] flex-col overflow-hidden rounded-[26px] border border-[#dbe4de] bg-white shadow-[0_22px_70px_-42px_rgba(6,63,43,0.45)]">
      <div aria-hidden="true" className="invoice-brand-top pointer-events-none absolute inset-x-0 top-0 hidden h-44 overflow-hidden sm:block">
        <div className="absolute right-0 top-0 h-40 w-[62%] bg-[#022D22] [clip-path:polygon(10%_0,100%_0,100%_88%,82%_67%,49%_76%,24%_70%,16%_45%)]" />
        <div className="absolute right-0 top-0 h-36 w-[55%] bg-[#087B57] [clip-path:polygon(12%_0,100%_0,100%_76%,80%_61%,48%_68%,26%_62%,18%_38%)]" />
        <div className="absolute right-0 top-0 h-1.5 w-40 bg-[#D6A842]" />
      </div>

      <header className="relative z-10 px-7 pb-7 pt-8 sm:min-h-[176px] sm:px-11 sm:pb-8 sm:pt-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm sm:-mt-4">
            <Image
              src="/logo-tight.png"
              alt="Maputo Publicidade"
              width={190}
              height={72}
              className="h-[58px] w-auto object-contain"
              priority
            />
            <div className="mt-4 space-y-0.5 text-[13px] leading-5 text-[#65736b]">
              <p className="font-semibold text-[#34453d]">{companyProfile.legalName}</p>
              {companyProfile.nuit ? <p>NUIT {companyProfile.nuit}</p> : null}
              <p>{companyProfile.address}</p>
              <p>{companyProfile.email}</p>
              {companyProfile.phone ? <p>{companyProfile.phone}</p> : null}
            </div>
          </div>

          <div className="sm:-mt-5 sm:max-w-sm sm:text-right sm:text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-700 sm:text-white/85">Fatura proforma</p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-dark sm:text-[34px] sm:text-white">
              {invoice.reference}
            </h2>
            <div className="document-status mt-4 inline-flex rounded-full bg-white/95 p-0.5 shadow-sm">
              <StatusBadge status={invoice.status} label={invoice.status_display} />
            </div>
          </div>
        </div>
      </header>

      <section className="invoice-meta-grid relative z-10 mx-7 grid overflow-hidden rounded-xl border border-[#dfe7e1] bg-[#f4f7f4] px-4 sm:mx-11 sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        <MetaItem icon={CalendarDays} label="Emissão">
          {formatDate(invoice.issue_date)}
        </MetaItem>
        <MetaItem icon={CalendarDays} label="Vencimento">
          {formatDate(invoice.due_date)}
        </MetaItem>
        <MetaItem icon={FileText} label="Referência">
          {invoice.order_reference ? (
            <Link className="text-brand-700 hover:underline" href={`/admin/encomendas/${invoice.order_reference}`}>
              {invoice.order_reference}
            </Link>
          ) : (
            invoice.reference
          )}
        </MetaItem>
        <MetaItem icon={CircleDollarSign} label="Moeda">
          {invoice.currency}
        </MetaItem>
      </section>

      <div className="invoice-document-body flex-1 space-y-9 px-7 py-9 sm:px-11 sm:py-10">
        <section className="invoice-party-card grid gap-6 rounded-xl border border-[#e0e8e2] border-l-4 border-l-[#D6A842] bg-[#fbfcfa] p-6 sm:grid-cols-[1fr_auto] sm:items-start sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-brand-700">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Faturado a</p>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-[-0.02em] text-dark">
              {invoice.client_company || invoice.client_name}
            </p>
            {invoice.client_company ? <p className="mt-1 text-sm font-medium text-[#526159]">{invoice.client_name}</p> : null}
          </div>
          <div className="space-y-1 text-sm leading-5 text-[#65736b] sm:max-w-xs sm:text-right">
            {invoice.client_nuit ? <p><span className="font-medium text-[#44544c]">NUIT</span> {invoice.client_nuit}</p> : null}
            {invoice.billing_address ? <p className="whitespace-pre-line">{invoice.billing_address}</p> : null}
            {invoice.client_email ? <p>{invoice.client_email}</p> : null}
            {invoice.client_phone ? <p>{invoice.client_phone}</p> : null}
          </div>
        </section>

        <div className="invoice-items-table overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed text-sm">
            <thead>
              <tr className="bg-[#087B57] text-left text-[10px] font-bold uppercase tracking-[0.13em] text-white">
                <th className="w-[8%] border-r border-white/30 px-3 py-3.5 text-center">Nº</th>
                <th className="w-[50%] border-r border-white/30 px-5 py-3.5">Descrição</th>
                <th className="w-[10%] border-r border-white/30 px-3 py-3.5 text-right">Qtd.</th>
                <th className="w-[16%] px-3 py-3.5 text-right">Preço unit.</th>
                <th className="w-[16%] border-l border-white/30 px-5 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id ?? `${item.description}-${index}`} className="border-b border-[#e6ece8] odd:bg-white even:bg-[#f7f9f7] last:border-b-0">
                  <td className="border-r border-[#e6ece8] px-3 py-4 text-center text-xs font-semibold tabular-nums text-[#7b8981]">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-5 py-4 font-medium leading-5 text-[#27372f]">{item.description}</td>
                  <td className="px-3 py-4 text-right tabular-nums text-[#617068]">
                    {Number(item.quantity).toLocaleString('pt-MZ')}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums text-[#617068]">{formatMZN(item.unit_price)}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-dark">
                    {formatMZN(item.line_total ?? item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`grid gap-8 ${hasSupplementaryInformation ? 'lg:grid-cols-[1fr_360px]' : ''}`}>
          {hasSupplementaryInformation ? (
            <div className="invoice-notes grid content-start gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {companyProfile.bankAccount || companyProfile.bankNib ? (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">Dados bancários</p>
                  <dl className="mt-2 grid max-w-xl gap-x-3 gap-y-1 text-sm leading-6 text-[#65736b] sm:grid-cols-[auto_1fr]">
                    {companyProfile.bankName ? (
                      <>
                        <dt className="font-medium text-[#44544c]">Banco</dt>
                        <dd>{companyProfile.bankName}</dd>
                      </>
                    ) : null}
                    {companyProfile.bankAccount ? (
                      <>
                        <dt className="font-medium text-[#44544c]">N.º de conta</dt>
                        <dd className="tabular-nums">{companyProfile.bankAccount}</dd>
                      </>
                    ) : null}
                    {companyProfile.bankNib ? (
                      <>
                        <dt className="font-medium text-[#44544c]">NIB</dt>
                        <dd className="tabular-nums">{companyProfile.bankNib}</dd>
                      </>
                    ) : null}
                  </dl>
                </section>
              ) : null}
              {invoice.terms ? (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">Condições de pagamento</p>
                  <p className="mt-2 max-w-xl whitespace-pre-line text-sm leading-6 text-[#65736b]">{invoice.terms}</p>
                </section>
              ) : null}
              {invoice.notes ? (
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">Observações</p>
                  <p className="mt-2 max-w-xl whitespace-pre-line text-sm leading-6 text-[#65736b]">{invoice.notes}</p>
                </section>
              ) : null}
            </div>
          ) : null}

          <dl className={`totals-block overflow-hidden rounded-xl border border-[#dce5df] bg-[#f7faf8] ${hasSupplementaryInformation ? '' : 'ml-auto w-full max-w-[360px]'}`}>
            <div className="space-y-3 px-5 py-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#65736b]">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-dark">{formatMZN(invoice.subtotal)}</dd>
              </div>
              {invoice.discount_amount > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#65736b]">Desconto</dt>
                  <dd className="font-semibold tabular-nums text-dark">− {formatMZN(invoice.discount_amount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[#65736b]">IVA ({Number(invoice.tax_rate).toLocaleString('pt-MZ')}%)</dt>
                <dd className="font-semibold tabular-nums text-dark">{formatMZN(invoice.tax_amount)}</dd>
              </div>
              {invoice.amount_paid > 0 ? (
                <div className="flex justify-between gap-4 text-brand-700">
                  <dt>Valor pago</dt>
                  <dd className="font-semibold tabular-nums">{formatMZN(invoice.amount_paid)}</dd>
                </div>
              ) : null}
            </div>
            <div className="flex items-end justify-between gap-4 border-l-4 border-l-[#D6A842] bg-[#087B57] px-5 py-5 text-white">
              <dt>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">Total</span>
                <span className="mt-1 block text-sm font-medium text-white/80">Valor da fatura</span>
              </dt>
              <dd className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{formatMZN(invoice.total)}</dd>
            </div>
            {invoice.balance_due > 0 ? (
              <div className="flex justify-between gap-4 border-t border-[#dce5df] bg-[#fffaf0] px-5 py-3 text-sm text-[#8a6828]">
                <dt className="font-medium">Saldo por liquidar</dt>
                <dd className="font-bold tabular-nums">{formatMZN(invoice.balance_due)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <footer className="invoice-document-footer relative mt-auto min-h-28 overflow-hidden bg-[#022D22] px-7 py-7 text-xs text-white sm:px-11">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[70%] bg-[#087B57] [clip-path:polygon(0_0,88%_18%,100%_100%,0_100%)]" />
        <div aria-hidden="true" className="absolute left-0 top-0 h-1.5 w-[72%] bg-[#D6A842] [clip-path:polygon(0_0,96%_0,100%_100%,0_100%)]" />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold">Obrigado pela sua confiança.</p>
            <p className="mt-2 text-white/70">{companyProfile.email}</p>
          </div>
          <p className="max-w-xs text-white/70 sm:text-right">{companyProfile.address}</p>
        </div>
      </footer>
    </article>
  );
}
