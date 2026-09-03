'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Building2,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { getMe, updateCompanyProfile, updateMe } from '@/lib/client-api';
import type { User as UserType, UserProfile } from '@/lib/api';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const fieldClass =
  'mt-2 h-11 rounded-xl border-[#d5dfd8] bg-[#fbfcfa] focus:border-brand-400 focus:bg-white focus:ring-brand/20';
const textareaClass =
  'mt-2 rounded-xl border-[#d5dfd8] bg-[#fbfcfa] focus:border-brand-400 focus:bg-white focus:ring-brand/20';

type CompanyForm = {
  company: string;
  nuit: string;
  phone: string;
  website: string;
  address: string;
  billingAddress: string;
};

type ContactForm = {
  firstName: string;
  lastName: string;
};

const emptyCompanyForm: CompanyForm = {
  company: '',
  nuit: '',
  phone: '',
  website: '',
  address: '',
  billingAddress: '',
};

function companyFormFromProfile(profile?: UserProfile): CompanyForm {
  return {
    company: profile?.company || '',
    nuit: profile?.nuit || '',
    phone: profile?.phone || '',
    website: profile?.website || '',
    address: profile?.address || '',
    billingAddress: profile?.billing_address || '',
  };
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="A carregar perfil da empresa">
      <div className="h-56 rounded-3xl bg-[#e2e9e3]" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[620px] rounded-3xl bg-[#e2e9e3]" />
        <div className="h-96 rounded-3xl bg-[#e2e9e3]" />
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [contactForm, setContactForm] = useState<ContactForm>({ firstName: '', lastName: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data);
        setCompanyForm(companyFormFromProfile(data.profile));
        setContactForm({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
        });
        setLogoPreview(data.profile?.company_logo || '');
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o perfil.')
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const completion = useMemo(() => {
    const values = [
      companyForm.company,
      companyForm.nuit,
      companyForm.phone,
      companyForm.address,
      logoPreview,
    ];
    return Math.round((values.filter((value) => value.trim()).length / values.length) * 100);
  }, [companyForm.address, companyForm.company, companyForm.nuit, companyForm.phone, logoPreview]);

  function updateCompanyField(field: keyof CompanyForm, value: string) {
    setCompanyForm((current) => ({ ...current, [field]: value }));
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError('Use um logótipo em PNG, JPG ou WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('O logótipo deve ter no máximo 2 MB.');
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview('');
    setRemoveLogo(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleCompanySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCompany(true);
    setError('');
    setSuccess('');
    try {
      const profile = await updateCompanyProfile({
        company: companyForm.company.trim(),
        nuit: companyForm.nuit.trim(),
        phone: companyForm.phone.trim(),
        website: companyForm.website.trim(),
        address: companyForm.address.trim(),
        billing_address: companyForm.billingAddress.trim(),
        company_logo: logoFile,
        remove_company_logo: removeLogo,
      });
      setCompanyForm(companyFormFromProfile(profile));
      setLogoPreview(profile.company_logo || '');
      setLogoFile(null);
      setRemoveLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
      setUser((current) => (current ? { ...current, profile } : current));
      setSuccess('Perfil da empresa atualizado com sucesso.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao guardar os dados da empresa.');
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingContact(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateMe({
        first_name: contactForm.firstName.trim(),
        last_name: contactForm.lastName.trim(),
      });
      setUser(updated);
      setContactForm({
        firstName: updated.first_name || '',
        lastName: updated.last_name || '',
      });
      setSuccess('Dados do responsável atualizados com sucesso.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao guardar o responsável.');
    } finally {
      setSavingContact(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-brand-900 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[52px] border-white/[0.035]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/10">
              <Building2 className="h-3.5 w-3.5" />
              Identidade da empresa
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              A sua empresa, pronta para cada novo projeto.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
              Mantenha os dados oficiais atualizados para acelerar propostas, faturação e novos pedidos.
            </p>
          </div>
          <div className="min-w-56 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-white/65">Perfil preenchido</span>
              <span className="text-lg font-semibold">{completion}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-brand-200 transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/55">
              Empresa, NUIT, telefone, morada e logótipo.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleCompanySubmit} className="overflow-hidden rounded-3xl border border-[#dfe7e1] bg-white shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
          <div className="border-b border-[#e8ede9] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-dark">Dados da empresa</h2>
                <p className="mt-0.5 text-xs text-[#718078]">Informação usada pela equipa Maputo Publicidade.</p>
              </div>
            </div>
          </div>

          <div className="space-y-7 p-5 sm:p-7">
            <div>
              <Label className="text-sm font-semibold text-[#34463c]">Logótipo oficial</Label>
              <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-[#e1e8e3] bg-[#f8faf7] p-4 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dbe4dd] bg-white p-3 shadow-sm">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt={`Logótipo de ${companyForm.company || 'empresa'}`}
                      width={112}
                      height={112}
                      unoptimized
                      className="max-h-full w-auto object-contain"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-[#a2afa7]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-dark">Imagem principal da empresa</p>
                  <p className="mt-1 text-xs leading-5 text-[#718078]">
                    PNG, JPG ou WebP, até 2 MB. Prefira fundo transparente e boa resolução.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ccd9d0] bg-white px-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
                    >
                      <ImagePlus className="h-4 w-4" />
                      {logoPreview ? 'Substituir logótipo' : 'Adicionar logótipo'}
                    </button>
                    {logoPreview ? (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#68776f] transition hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="sr-only"
                    aria-label="Selecionar logótipo da empresa"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="company" className="text-sm font-semibold text-[#34463c]">Nome ou razão social</Label>
                <Input id="company" value={companyForm.company} onChange={(event) => updateCompanyField('company', event.target.value)} autoComplete="organization" placeholder="Ex.: Empresa Moçambicana, Lda" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="nuit" className="text-sm font-semibold text-[#34463c]">NUIT</Label>
                <Input id="nuit" value={companyForm.nuit} onChange={(event) => updateCompanyField('nuit', event.target.value)} inputMode="numeric" placeholder="Ex.: 400123456" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-semibold text-[#34463c]">Telefone principal</Label>
                <Input id="phone" type="tel" value={companyForm.phone} onChange={(event) => updateCompanyField('phone', event.target.value)} autoComplete="tel" placeholder="+258 84 000 0000" className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="website" className="text-sm font-semibold text-[#34463c]">Website</Label>
                <Input id="website" type="url" value={companyForm.website} onChange={(event) => updateCompanyField('website', event.target.value)} autoComplete="url" placeholder="https://empresa.co.mz" className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address" className="text-sm font-semibold text-[#34463c]">Morada física ou de entrega</Label>
                <Textarea id="address" value={companyForm.address} onChange={(event) => updateCompanyField('address', event.target.value)} autoComplete="street-address" placeholder="Rua, número, bairro, cidade" className={textareaClass} rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="billing_address" className="text-sm font-semibold text-[#34463c]">Morada de faturação</Label>
                <Textarea id="billing_address" value={companyForm.billingAddress} onChange={(event) => updateCompanyField('billingAddress', event.target.value)} placeholder="Deixe em branco se for igual à morada física" className={textareaClass} rows={3} />
              </div>
            </div>

            <div className="flex justify-end border-t border-[#e8ede9] pt-5">
              <Button type="submit" disabled={savingCompany} className="h-11 gap-2 px-5">
                <Save className="h-4 w-4" />
                {savingCompany ? 'A guardar...' : 'Guardar perfil da empresa'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="space-y-5">
          <form onSubmit={handleContactSubmit} className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0e8] text-[#987338]">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-dark">Responsável pela conta</h2>
                <p className="mt-0.5 text-xs text-[#718078]">Contacto principal do BrandDesk.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="first_name" className="text-sm font-semibold text-[#34463c]">Nome</Label>
                <Input id="first_name" value={contactForm.firstName} onChange={(event) => setContactForm((current) => ({ ...current, firstName: event.target.value }))} autoComplete="given-name" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-sm font-semibold text-[#34463c]">Apelido</Label>
                <Input id="last_name" value={contactForm.lastName} onChange={(event) => setContactForm((current) => ({ ...current, lastName: event.target.value }))} autoComplete="family-name" className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-[#34463c]">E-mail de acesso</Label>
                <Input id="email" value={user?.email || ''} disabled className={`${fieldClass} bg-[#f1f4f1]`} />
                <p className="mt-2 text-xs leading-5 text-[#829087]">Este é o e-mail usado para entrar no BrandDesk.</p>
              </div>
            </div>

            <Button type="submit" variant="outline" disabled={savingContact} className="mt-5 h-11 w-full gap-2">
              <Save className="h-4 w-4" />
              {savingContact ? 'A guardar...' : 'Guardar responsável'}
            </Button>
          </form>

          <section className="rounded-3xl bg-brand-900 p-5 text-white sm:p-6">
            <ShieldCheck className="h-5 w-5 text-brand-200" />
            <h2 className="mt-4 font-semibold">Usado automaticamente</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Estes dados ajudam a preparar documentos e pedidos com a identidade certa da sua empresa.
            </p>
            <ul className="mt-5 space-y-3 text-xs text-white/75">
              <li className="flex items-center gap-3"><ReceiptText className="h-4 w-4 text-brand-200" /> Propostas e faturação</li>
              <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-brand-200" /> Entregas e instalação</li>
              <li className="flex items-center gap-3"><Globe2 className="h-4 w-4 text-brand-200" /> Identificação da marca</li>
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-brand-200" /> Contacto operacional</li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-brand-200" /> Comunicação da conta</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
