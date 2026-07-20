"use client";
import { useEffect } from "react";

// Recarrega a página a cada 5s enquanto houver execução em andamento —
// pra a barra "IA implementando…" e o botão de deploy atualizarem sozinhos.
export default function AutoRefresh({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => location.reload(), 5000);
    return () => clearInterval(t);
  }, [active]);
  return null;
}
