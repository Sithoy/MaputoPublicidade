import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

export const metadata = {
  title: 'Contactos | Maputo Publicidade',
  description: 'Entre em contacto com a Maputo Publicidade.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-dark md:text-4xl">Contactos</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Estamos prontos para ajudar o seu projecto. Fale connosco por telefone, e-mail ou WhatsApp.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">Telefone</h2>
              <p className="text-gray-600">82 555 736 / 84 741 2838 / 84 555 0250</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">E-mail</h2>
              <a href="mailto:maputopublicidade@outlook.com" className="text-gray-600 hover:text-brand">
                maputopublicidade@outlook.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">Morada</h2>
              <p className="text-gray-600">Rua da Resistência Nº 1550 R/C, Maputo, Moçambique</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">Horário</h2>
              <p className="text-gray-600">Segunda a Sexta: 08h00 - 17h00</p>
              <p className="text-gray-600">Sábado: 08h00 - 12h00</p>
            </div>
          </div>

          <a
            href="https://wa.me/25882555736?text=Olá! Gostaria de falar com a Maputo Publicidade."
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="mt-2 gap-2">
              <MessageCircle className="h-5 w-5" />
              Falar no WhatsApp
            </Button>
          </a>

          <div className="aspect-video w-full rounded-xl bg-gray-100">
            <iframe
              title="Maputo Publicidade localização"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.0!2d32.5833!3d-25.9667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDU4JzAwLjEiUyAzMsKwMzUnMDAuMCJF!5e0!3m2!1spt-PT!2smz!4v1600000000000!5m2!1spt-PT!2smz"
              className="h-full w-full rounded-xl border-0"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>

        <form className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-xl font-semibold text-dark">Envie uma mensagem rápida</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
          </div>
          <div>
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" name="subject" required />
          </div>
          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" name="message" rows={5} required />
          </div>
          <Button type="submit" className="w-full">
            Enviar mensagem
          </Button>
        </form>
      </div>
    </div>
  );
}
