"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { PortfolioItem } from "@/lib/api";
import { portfolioImageIsIllustrative } from "@/lib/portfolio-presentation";

export function PortfolioPhoto({
  item,
  detail = false,
}: {
  item: PortfolioItem;
  detail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image]);
  const illustrative = portfolioImageIsIllustrative(item.image);
  return (
    <div
      className={`relative overflow-hidden bg-[#F1EDE5] ${detail ? "aspect-[3/2] rounded-2xl" : "aspect-[4/3] rounded-[1.5rem]"}`}
    >
      {item.image && !failed ? (
        <Image
          src={item.image}
          alt={illustrative ? `Imagem ilustrativa: ${item.title}` : item.title}
          fill
          sizes={
            detail
              ? "(min-width: 1024px) 680px, 100vw"
              : "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          }
          quality={85}
          className={
            detail
              ? "object-contain"
              : "object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.035]"
          }
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-[#7A6A48]">
          <ImageOff aria-hidden="true" className="h-7 w-7 stroke-1" />
          <p className="text-xs">
            {failed ? "Fotografia indisponível" : "Fotografia por adicionar"}
          </p>
        </div>
      )}
      {illustrative && !failed ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-800">
          Imagem ilustrativa
        </span>
      ) : null}
    </div>
  );
}
