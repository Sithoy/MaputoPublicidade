import { ClientProposalReview } from '@/components/ClientProposalReview';

export const metadata = { title: 'A sua proposta', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default function ProposalReviewPage() { return <ClientProposalReview />; }
