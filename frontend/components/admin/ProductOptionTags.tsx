"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function ProductOptionTags({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const next = [...value];
    for (const part of input.split(",")) {
      const item = part.trim();
      if (
        item &&
        !next.some((v) => v.toLocaleLowerCase() === item.toLocaleLowerCase())
      )
        next.push(item);
    }
    onChange(next);
    setInput("");
  }
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-brand-800"
      >
        {label}
      </label>
      {hint ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={() => {
            if (input.trim()) add();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Escreva uma opção e adicione"
          className="min-w-0 flex-1 rounded-xl border border-[#DCE5DE] bg-white px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          aria-label={`Adicionar: ${label}`}
          onClick={add}
          disabled={!input.trim()}
          className="rounded-xl border border-[#DCE5DE] bg-white px-3 text-brand-800 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800"
          >
            {item}
            <button
              type="button"
              aria-label={`Remover ${item}: ${label}`}
              onClick={() => onChange(value.filter((v) => v !== item))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      {input.trim() ? (
        <p className="mt-1 text-xs text-[#8A671E]">
          Prima Enter ou + para incluir esta opção.
        </p>
      ) : null}
    </div>
  );
}
