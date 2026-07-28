"use client";
import { sacadaHtml, type SacadaFull } from "@/lib/sacada-html";

// Baixa a sacada como HTML standalone (i10 style, com o gráfico embutido).
// Auto-contido: abre offline e dá pra imprimir em PDF pelo navegador.
export default function DownloadButton({ sacada }: { sacada: SacadaFull }) {
  return (
    <button
      type="button"
      className="mk-dl"
      onClick={() => {
        const html = sacadaHtml(sacada);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = (sacada.manchete || "sacada").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        a.href = url;
        a.download = `radar-i10-${sacada.dia}-${slug}.html`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      ⤓ baixar HTML
    </button>
  );
}
