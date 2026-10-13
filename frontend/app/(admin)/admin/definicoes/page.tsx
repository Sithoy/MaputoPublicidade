import { WhatsAppSettings } from '@/components/admin/WhatsAppSettings';
import { EmailSettings } from '@/components/admin/EmailSettings';

export default function SettingsPage() {
  return <div className="space-y-6"><EmailSettings /><WhatsAppSettings /></div>;
}
