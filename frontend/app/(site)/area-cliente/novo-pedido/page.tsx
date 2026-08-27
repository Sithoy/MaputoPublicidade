import { Suspense } from 'react';
import { BrandRequestWizard } from './_components/BrandRequestWizard';

function WizardLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="A preparar o novo pedido">
      <div className="h-44 rounded-3xl bg-[#e2e9e3]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-44 rounded-2xl bg-[#e2e9e3]" />
        <div className="h-44 rounded-2xl bg-[#e2e9e3]" />
        <div className="h-44 rounded-2xl bg-[#e2e9e3]" />
      </div>
    </div>
  );
}

export default function NewBrandRequestPage() {
  return (
    <Suspense fallback={<WizardLoading />}>
      <BrandRequestWizard />
    </Suspense>
  );
}
