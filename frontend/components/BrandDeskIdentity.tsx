export function BrandDeskIdentity({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-3" aria-label="BrandDesk by ETIOS">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c8a75c]/40 bg-[#c8a75c]/10 font-semibold text-[#c8a75c]"
      >
        B<span className="text-xs">D</span>
      </span>
      <span className="leading-none">
        <span
          className={`block text-xl font-semibold tracking-[-0.055em] ${dark ? "text-[#fbf8ef]" : "text-[#173f35]"}`}
        >
          BrandDesk
        </span>
        <span
          className={`mt-1.5 block text-[10px] tracking-[0.15em] ${dark ? "text-[#c8a75c]" : "text-[#876a31]"}`}
        >
          by ETIOS
        </span>
      </span>
    </span>
  );
}
