import Link from 'next/link';
import { brandDeskReviewPath } from '@/lib/branddesk-review';

export function ApprovalAccountAccess({ reference, kind }: { reference: string; kind: 'proposal' | 'art' }) {
  return <aside aria-label="Aprovação no BrandDesk" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d8c58e] bg-[#faf7ec] p-5 text-[#173f30]">
    <div><p className="text-xs font-semibold uppercase tracking-wider text-[#92763f]">BrandDesk by ETIOS</p><h2 className="mt-2 font-semibold">Já tem conta? Reveja este pedido no BrandDesk.</h2><p className="mt-2 max-w-xl text-sm leading-6">Inicie sessão na conta associada a este pedido. A versão e a decisão são as mesmas em todos os canais. Também pode responder aqui sem iniciar sessão.</p></div>
    <Link href={brandDeskReviewPath(reference, kind)} className="rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white">Continuar no BrandDesk →</Link>
  </aside>;
}
