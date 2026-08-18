import { SiteFrame } from '@/components/SiteFrame';
import '@flaticon/flaticon-uicons/css/solid/rounded.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
