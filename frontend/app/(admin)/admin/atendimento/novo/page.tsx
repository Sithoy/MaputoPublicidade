import { redirect } from 'next/navigation';

export default function LegacyIntakePage() {
  redirect('/admin/orcamentos/novo');
}
