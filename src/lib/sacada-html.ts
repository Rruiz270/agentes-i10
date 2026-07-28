// Markup i10-style de gráfico + HTML de download de uma sacada. Usa estilos
// INLINE (portável): o mesmo `chartMarkup` alimenta o painel (via
// dangerouslySetInnerHTML), o arquivo de download e o compilado semanal.
export type Serie = { label: string; valor: number; destaque?: boolean };
export type Grafico = { tipo?: string; titulo?: string; unidade?: string; series?: Serie[] } | null;
export type SacadaFull = {
  dia: string; manchete: string; numero_ancora: string; sacada: string;
  e_dai: string; angulo: string; metodo: string; fonte: string; confianca: string; grafico_data: Grafico;
};

const C = { ink: "#e7eef8", dim: "#93a4c8", faint: "#5f6f92", cyan: "#22d3ee", mint: "#34e5a4", muted: "#2b3a5e", bd: "rgba(120,170,245,.16)" };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function chartMarkup(g: Grafico): string {
  const series = (g?.series || []).filter((s) => s && isFinite(Number(s.valor))).slice(0, 7);
  if (!series.length) return "";
  const titulo = g?.titulo ? `<div style="font:700 10.5px ui-monospace,Menlo,monospace;letter-spacing:.07em;text-transform:uppercase;color:${C.dim};margin:0 0 12px">${esc(g.titulo)}${g?.unidade ? ` · ${esc(g.unidade)}` : ""}</div>` : "";

  if ((g?.tipo || "barras") === "donut") {
    const total = series.reduce((a, s) => a + Math.max(0, Number(s.valor)), 0) || 1;
    const cols = [C.mint, C.cyan, "#7aa0e6", C.faint, "#4a5a80"];
    let off = 25, slices = "";
    series.forEach((s, i) => {
      const pct = (Math.max(0, Number(s.valor)) / total) * 100;
      const col = s.destaque ? C.mint : cols[(i + 1) % cols.length];
      slices += `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${col}" stroke-width="5.5" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"></circle>`;
      off = (off - pct + 100) % 100;
    });
    const legenda = series.map((s, i) => {
      const col = s.destaque ? C.mint : cols[(i + 1) % cols.length];
      const pct = ((Math.max(0, Number(s.valor)) / total) * 100).toFixed(1);
      return `<div style="display:flex;align-items:center;gap:7px;margin:3px 0;font-size:12px;color:${s.destaque ? C.ink : C.dim}"><span style="width:9px;height:9px;border-radius:2px;background:${col};flex:none"></span><span style="flex:1">${esc(s.label)}</span><b style="font-variant-numeric:tabular-nums;color:${C.ink}">${pct}%</b></div>`;
    }).join("");
    return `<div style="margin:14px 0 2px">${titulo}<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 42 42" width="132" height="132" style="transform:rotate(-90deg);flex:none"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(120,170,245,.10)" stroke-width="5.5"></circle>${slices}</svg><div style="flex:1;min-width:180px">${legenda}</div></div></div>`;
  }

  // barras horizontais
  const max = Math.max(...series.map((s) => Math.max(0, Number(s.valor)))) || 1;
  const rows = series.map((s) => {
    const w = Math.max(2, (Math.max(0, Number(s.valor)) / max) * 100);
    const fill = s.destaque ? `linear-gradient(90deg,${C.cyan},${C.mint})` : C.muted;
    return `<div style="display:flex;align-items:center;gap:10px;margin:7px 0">
      <span style="width:40%;font-size:12.5px;color:${s.destaque ? C.ink : C.dim};font-weight:${s.destaque ? 700 : 400};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.label)}</span>
      <span style="flex:1;height:14px;background:rgba(120,170,245,.10);border-radius:7px;overflow:hidden"><span style="display:block;height:100%;width:${w.toFixed(1)}%;background:${fill};border-radius:7px"></span></span>
      <span style="width:74px;text-align:right;font:700 12px ui-monospace,Menlo,monospace;color:${s.destaque ? C.mint : C.dim};font-variant-numeric:tabular-nums">${fmt(Number(s.valor))}</span>
    </div>`;
  }).join("");
  return `<div style="margin:14px 0 2px">${titulo}${rows}</div>`;
}

// HTML standalone (download / print-to-PDF) de UMA sacada, com a marca i10.
export function sacadaHtml(s: SacadaFull): string {
  const conf = s.confianca === "baixa" ? '<span style="font:700 10px ui-monospace,monospace;color:#ffb454;background:rgba(255,180,84,.14);padding:3px 8px;border-radius:6px">revisar antes de publicar</span>' : "";
  const block = (lbl: string, txt: string) => txt ? `<p style="font:700 10px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${C.mint};margin:16px 0 3px">${lbl}</p><p style="margin:0;color:${C.dim};line-height:1.6">${esc(txt)}</p>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.manchete)}</title>
<style>@media print{body{background:#fff}}</style></head>
<body style="margin:0;background:#0a1020;color:${C.ink};font:15px/1.6 Inter,system-ui,-apple-system,Arial,sans-serif">
<div style="max-width:720px;margin:0 auto;padding:40px 24px 60px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
    <span style="font-weight:800;letter-spacing:-.5px">Instituto&nbsp;<i style="font-style:normal;color:${C.cyan}">i</i><b style="color:${C.mint}">10</b> · Radar de Mercado</span>
    <span style="font:700 12px ui-monospace,monospace;color:${C.faint}">${esc(s.dia)}</span>
  </div>
  <div style="background:linear-gradient(180deg,rgba(120,165,235,.06),rgba(120,165,235,.02));border:1px solid ${C.bd};border-radius:16px;padding:26px 28px">
    ${conf ? `<div style="text-align:right;margin-bottom:6px">${conf}</div>` : ""}
    <div style="color:${C.cyan};font-weight:800;font-size:15px;line-height:1.4;margin-bottom:10px">${esc(s.numero_ancora)}</div>
    <h1 style="font-size:26px;font-weight:900;line-height:1.25;margin:0 0 14px;text-wrap:balance">${esc(s.manchete)}</h1>
    <p style="margin:0;color:${C.dim};line-height:1.65">${esc(s.sacada)}</p>
    ${chartMarkup(s.grafico_data)}
    ${block("Por que importa", s.e_dai)}
    ${block("Ângulo de conteúdo", s.angulo)}
    ${block("Método", s.metodo)}
    ${s.fonte ? `<p style="font-size:11.5px;color:${C.faint};margin-top:16px;border-top:1px solid ${C.bd};padding-top:12px">${esc(s.fonte)}</p>` : ""}
  </div>
  <p style="color:${C.faint};font-size:12px;text-align:center;margin-top:26px">Gerado pela Central de Agentes i10 · fonte primária: base i10/PNCP · confira as ressalvas antes de publicar</p>
</div></body></html>`;
}
