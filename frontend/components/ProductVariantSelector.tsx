'use client';

import { useState } from 'react';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { AddToCartModal } from '@/components/AddToCartModal';
import { getProductFallback, getProductImageSrc } from '@/lib/image-fallbacks';
import { whatsappHref } from '@/lib/company';
import type { Product } from '@/lib/api';
import { productCategoryName, productTemplate, productTemplates } from '@/lib/product-configuration';

export function ProductVariantSelector({ product }: { product: Product }) {
  const variants = (product.variants ?? []).filter(v => v.is_active !== false);
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const selected = variants.find(v => v.id === selectedId) ?? null;
  const [cartOpen, setCartOpen] = useState(false);
  const price = product.pricing_complexity === 'complex' ? undefined : selected?.price ?? product.starting_price ?? product.base_price;
  const apparel = product.order_template === 'apparel';
  const sizes = apparel ? product.apparel_options?.sizes : product.sizes;
  const facts = [
    { label: 'Serviços aplicáveis', value: product.available_service_names?.join(', ') },
    ...productTemplates[productTemplate(product)].fields.map(field => ({ label: field.label, value: product.configuration_options?.[field.key]?.join(', ') })),
    { label: 'Materiais', value: product.materials?.join(', ') },
    { label: 'Tamanhos', value: sizes?.join(', ') },
    { label: 'Modelos', value: apparel ? product.apparel_options?.models?.join(', ') : '' },
    { label: 'Cores', value: apparel ? product.apparel_options?.colors?.join(', ') : '' },
    { label: 'Pedido mínimo', value: product.min_quantity ? `${product.min_quantity} ${product.min_quantity === 1 ? 'unidade' : 'unidades'}` : '' },
    { label: 'Prazo estimado', value: product.lead_time },
  ].filter(fact => fact.value);

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-[#E3E8E4] bg-[#F3F5F0]">
            <SafeImage src={getProductImageSrc(product, selected)} fallbackSrc={getProductFallback(product)} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-8 sm:p-12" priority />
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-[#66736D]"><Check className="h-4 w-4 text-brand" />A personalização final é confirmada na proposta.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{productCategoryName(product)}</p>
          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-[-0.035em] text-brand-800 sm:text-4xl">{product.name}</h1>
          <p className="mt-4 whitespace-pre-line text-base leading-7 text-[#66736D]">{product.description}</p>
          {variants.length ? <fieldset className="mt-6"><legend className="mb-3 text-sm font-bold text-brand-800">Escolha a opção para o seu pedido</legend><div className="flex flex-wrap gap-2">{variants.map(variant => <button type="button" key={variant.id} onClick={() => setSelectedId(variant.id)} aria-pressed={selectedId === variant.id} className={`rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${selectedId === variant.id ? 'border-brand bg-brand-50 text-brand-800' : 'border-[#DCE5DE] bg-white text-[#52635B] hover:border-brand'}`}><span className="block font-bold">{variant.name}</span><span className="mt-1 block text-xs">{product.pricing_complexity === 'complex' ? 'Valor na proposta' : `${new Intl.NumberFormat('pt-MZ').format(variant.price)} MZN`}</span></button>)}</div></fieldset> : null}
          <div className="mt-7 rounded-2xl border border-[#DCE5DE] bg-white p-6">
            <p className="text-xs font-semibold text-[#66736D]">{price != null ? 'Preço de referência' : 'Preparado à sua medida'}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-brand-800">{price != null ? `${!selected && product.has_variants ? 'Desde ' : ''}${new Intl.NumberFormat('pt-MZ').format(price)} MZN` : 'Sob consulta'}</p>
            <p className="mt-2 text-xs leading-5 text-[#66736D]">O valor final e o prazo são confirmados pela equipa, de acordo com a quantidade e a personalização.</p>
            <button onClick={() => setCartOpen(true)} className="mt-5 flex w-full items-center justify-between rounded-xl bg-brand-800 px-5 py-4 text-sm font-bold text-white transition hover:bg-brand-700">{apparel ? 'Configure a sua distribuição' : 'Personalize o seu pedido'}<ArrowRight className="h-4 w-4" /></button>
            <p className="mt-3 text-center text-xs text-[#66736D]">Adicione ao carrinho para solicitar a proposta. Não efetua um pagamento.</p>
          </div>
          {facts.length ? <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[#E3E8E4] py-6">{facts.map(fact => <div key={fact.label}><dt className="text-xs text-[#66736D]">{fact.label}</dt><dd className="mt-1 text-sm font-semibold text-brand-800">{fact.value}</dd></div>)}</dl> : null}
          <a href={whatsappHref(`Olá! Gostaria de esclarecer uma dúvida sobre ${product.name}${selected ? ` (${selected.name})` : ''}.`)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:underline"><MessageCircle className="h-4 w-4" />Tire uma dúvida com a nossa equipa</a>
        </div>
      </div>
      <section aria-label="Como funciona o pedido" className="mt-14 grid gap-6 rounded-2xl bg-[#F4F0E8] p-6 sm:grid-cols-3 sm:p-8">{[['01', 'Partilhe a sua ideia', 'Escolha as opções, quantidades e envie uma referência ou o seu logótipo.'], ['02', 'Receba a proposta', 'A MP confirma os detalhes, o preço e o prazo antes de avançar.'], ['03', 'Dê vida à sua marca', 'Após confirmação, acompanhe o trabalho com a nossa equipa.']].map(([number, title, text]) => <div key={number}><p className="text-xs font-bold tracking-widest text-[#8A671E]">{number}</p><h2 className="mt-2 text-sm font-bold text-brand-800">{title}</h2><p className="mt-2 text-sm leading-6 text-[#66736D]">{text}</p></div>)}</section>
      <AddToCartModal product={product} variant={selected} open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
