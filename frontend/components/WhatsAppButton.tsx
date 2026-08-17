'use client';

import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '25882555736';
const WHATSAPP_MESSAGE = 'Olá! Vi o site da Maputo Publicidade e gostaria de falar sobre um projeto.';

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-brand-800 text-white shadow-[0_12px_30px_-14px_rgba(6,63,43,0.8)] transition hover:-translate-y-0.5 hover:bg-brand focus:outline-none focus:ring-2 focus:ring-brand/35 focus:ring-offset-2 sm:right-6"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
