'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { disableAllMeasurement, setAnalyticsConsent, TRAFFIC_AGGREGATE, TRAFFIC_CONSENT } from '@/lib/website-traffic';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [choice, setChoice] = useState<'all' | 'basic' | 'none'>('basic');

  useEffect(() => {
    try {
      const consent = localStorage.getItem(TRAFFIC_CONSENT);
      const aggregate = localStorage.getItem(TRAFFIC_AGGREGATE);
      setChoice(aggregate === 'disabled' ? 'none' : consent === 'granted' ? 'all' : 'basic');
      if (!['granted', 'denied'].includes(consent || '') || !['enabled', 'disabled'].includes(aggregate || '')) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (selected: typeof choice) => {
    if (selected === 'none') disableAllMeasurement();
    else setAnalyticsConsent(selected === 'all');
    setChoice(selected);
    setCustomizing(false);
    setVisible(false);
  };

  if (!visible) return <div className="bg-brand-950 py-3 text-center"><button type="button" onClick={() => { setCustomizing(true); setVisible(true); }} className="text-xs text-white/80 underline">Preferências de privacidade</button></div>;

  return (
    <>
      <div className="h-64 sm:h-40" aria-hidden />
      <section aria-labelledby="cookie-banner-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85dvh] max-w-5xl overflow-y-auto rounded-2xl border border-[#dedbc9] bg-white p-5 shadow-[0_12px_48px_-12px_rgba(17,50,38,0.25)] sm:inset-x-6 sm:bottom-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
          <div className="min-w-0 flex-1">
            <h2 id="cookie-banner-title" className="text-base font-semibold text-brand-950">Cookies e privacidade</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Usamos cookies e tecnologias semelhantes para o site funcionar. Com a sua autorização, recolhemos também estatísticas detalhadas para melhorar a sua experiência.{' '}<Link href="/politica-cookies" className="font-medium text-brand-800 underline underline-offset-2">Saiba mais</Link>.</p>
          </div>
          <div className="w-full shrink-0 space-y-3 md:w-80">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <Button variant="outline" onClick={() => choose('all')} className="min-h-11 border-brand-800 text-sm text-brand-950">Aceitar todos</Button>
              <Button variant="outline" onClick={() => choose('none')} className="min-h-11 border-brand-800 text-sm text-brand-950">Rejeitar opcionais</Button>
            </div>
            <button type="button" onClick={() => setCustomizing((value) => !value)} aria-expanded={customizing} aria-controls={customizing ? 'cookie-preferences' : undefined} className="min-h-11 w-full text-sm font-medium text-brand-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-800">{customizing ? 'Fechar preferências' : 'Personalizar'}</button>
          </div>
        </div>
        {customizing ? <div id="cookie-preferences" className="mt-5 border-t border-[#ecebe2] pt-5">
          <p className="text-sm text-slate-600">Essenciais: sempre ativos para permitir a navegação e guardar a sua escolha. Os serviços continuam disponíveis com qualquer opção.</p>
          <fieldset className="mt-4 space-y-2">
            <legend className="mb-3 text-sm font-semibold text-brand-950">Estatísticas do website</legend>
            {([
              ['all', 'Permitir todas', 'Páginas visitadas, sessões e origem das visitas para melhorar o site.'],
              ['basic', 'Só estatísticas anónimas', 'Totais de páginas e ações, sem identificadores nem ligação entre visitas.'],
              ['none', 'Não permitir estatísticas', 'Desativar toda a medição de visitas.'],
            ] as const).map(([value, label, description]) => <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4e8df] p-3 has-[:checked]:border-brand-800 has-[:checked]:bg-brand-50">
              <input type="radio" name="cookie-measurement" value={value} checked={choice === value} onChange={() => setChoice(value)} className="mt-1 h-4 w-4 shrink-0 accent-brand-800" />
              <span><span className="block text-sm font-medium text-brand-950">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
            </label>)}
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => choose(choice)} className="min-h-11 text-sm">Guardar preferências</Button>
            <Link href="/privacidade" className="text-sm text-brand-800 underline underline-offset-2">Política de Privacidade</Link>
          </div>
        </div> : null}
      </section>
    </>
  );
}
