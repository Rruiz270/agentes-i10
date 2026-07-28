"use client";
import { useState } from "react";

// Botão "copiar pro post" — leva a sacada formatada pra área de transferência,
// pronta pra colar no blog/newsletter. Client component (usa clipboard).
export default function CopyButton({ text, label = "copiar pro post" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="mk-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch { /* clipboard bloqueado */ }
      }}
    >
      {ok ? "✓ copiado" : `⧉ ${label}`}
    </button>
  );
}
