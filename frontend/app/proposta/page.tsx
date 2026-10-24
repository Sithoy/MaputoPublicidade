import { ClientProposalReview } from '@/components/ClientProposalReview';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'A sua proposta',
  description: 'Consulte a proposta da Maputo Publicidade, reveja as condições e comunique a sua decisão num só lugar.',
  robots: { index: false, follow: false }, referrer: 'no-referrer' as const,
  openGraph: { type: 'website', url: '/proposta', siteName: 'Maputo Publicidade', title: 'A sua proposta · Maputo Publicidade', description: 'Reveja os detalhes. Aprove, peça alterações ou fale com a nossa equipa.', locale: 'pt_MZ' },
  twitter: { card: 'summary_large_image', title: 'A sua proposta · Maputo Publicidade', description: 'Reveja os detalhes e comunique a sua decisão no BrandDesk.', images: ['/proposta/opengraph-image'] },
};
export default function ProposalReviewPage() { return <ClientProposalReview />; }
