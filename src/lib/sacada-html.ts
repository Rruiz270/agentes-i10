// Markup de gráfico (tema-aware) + HTML de download de uma sacada no estilo do
// relatório-referência i10 (claro, Poppins, logo 3 barras, números em gradiente
// azul→verde, funnel bars). O painel usa o tema 'dark' (console); o download e o
// compilado semanal usam 'light' (relatório/newsletter).
export type Serie = { label: string; valor: number; destaque?: boolean };
export type Grafico = { tipo?: string; titulo?: string; unidade?: string; series?: Serie[] } | null;
export type SacadaFull = {
  dia: string; manchete: string; numero_ancora: string; sacada: string;
  e_dai: string; angulo: string; metodo: string; fonte: string; confianca: string; grafico_data: Grafico;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const GRAD = "linear-gradient(90deg,#1a5fd0,#00c281)";

const THEME = {
  dark: { ink: "#e7eef8", dim: "#93a4c8", track: "rgba(120,170,245,.10)", muted: "#2b3a5e", kicker: "#22d3ee", val: "#34e5a4" },
  light: { ink: "#16233d", dim: "#5d6f8e", track: "#e7edf6", muted: "#c3d0e6", kicker: "#17b3c9", val: "#0a8f5f" },
};

export function chartMarkup(g: Grafico, theme: "dark" | "light" = "dark"): string {
  const series = (g?.series || []).filter((s) => s && isFinite(Number(s.valor))).slice(0, 7);
  if (!series.length) return "";
  const T = THEME[theme];
  const donutCols = theme === "light" ? ["#00c281", "#1a5fd0", "#17b3c9", "#8494ad", "#c3d0e6"] : ["#34e5a4", "#22d3ee", "#7aa0e6", "#5f6f92", "#4a5a80"];
  const titulo = g?.titulo ? `<div style="font:700 10.5px ui-monospace,Menlo,monospace;letter-spacing:.09em;text-transform:uppercase;color:${T.kicker};margin:0 0 13px">${esc(g.titulo)}${g?.unidade ? ` · ${esc(g.unidade)}` : ""}</div>` : "";

  if ((g?.tipo || "barras") === "donut") {
    const total = series.reduce((a, s) => a + Math.max(0, Number(s.valor)), 0) || 1;
    let off = 25, slices = "", leg = "";
    series.forEach((s, i) => {
      const pct = (Math.max(0, Number(s.valor)) / total) * 100;
      const col = s.destaque ? donutCols[0] : donutCols[(i + 1) % donutCols.length];
      slices += `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${col}" stroke-width="5.5" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"></circle>`;
      off = (off - pct + 100) % 100;
      leg += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12.5px;color:${s.destaque ? T.ink : T.dim}"><span style="width:10px;height:10px;border-radius:3px;background:${col};flex:none"></span><span style="flex:1">${esc(s.label)}</span><b style="color:${T.ink};font-variant-numeric:tabular-nums">${pct.toFixed(1)}%</b></div>`;
    });
    return `<div>${titulo}<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 42 42" width="136" height="136" style="transform:rotate(-90deg);flex:none"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="${T.track}" stroke-width="5.5"></circle>${slices}</svg><div style="flex:1;min-width:190px">${leg}</div></div></div>`;
  }

  const max = Math.max(...series.map((s) => Math.max(0, Number(s.valor)))) || 1;
  const rows = series.map((s) => {
    const w = Math.max(2.5, (Math.max(0, Number(s.valor)) / max) * 100);
    const fill = s.destaque ? GRAD : T.muted;
    return `<div style="display:flex;align-items:center;gap:12px;margin:8px 0">
      <span style="width:38%;font-size:12.5px;color:${s.destaque ? T.ink : T.dim};font-weight:${s.destaque ? 700 : 500};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.label)}</span>
      <span style="flex:1;height:15px;background:${T.track};border-radius:7px;overflow:hidden"><span style="display:block;height:100%;width:${w.toFixed(1)}%;background:${fill};border-radius:7px"></span></span>
      <span style="width:78px;text-align:right;font:700 12.5px ui-monospace,Menlo,monospace;color:${s.destaque ? T.val : T.dim};font-variant-numeric:tabular-nums">${fmt(Number(s.valor))}</span>
    </div>`;
  }).join("");
  return `<div>${titulo}${rows}</div>`;
}

// HTML standalone (download / imprimir em PDF) de UMA sacada — estilo relatório i10.
export function sacadaHtml(s: SacadaFull): string {
  const bigM = String(s.numero_ancora || "").match(/\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?\s?%|R\$\s?[\d.,]+\s?(?:tri|bi|mi)?/i);
  const big = bigM ? bigM[0] : "";
  const flag = s.confianca === "baixa" ? '<span style="display:inline-block;margin-left:8px;font:700 10px ui-monospace,monospace;color:#a86a00;background:#fff2d6;padding:3px 9px;border-radius:6px;vertical-align:middle">revisar antes de publicar</span>' : "";
  const sec = (kicker: string, txt: string) => txt ? `<section><div class="wrap"><div class="kicker">${kicker}</div><p class="lead" style="margin:0">${esc(txt)}</p></div></section>` : "";
  const chart = chartMarkup(s.grafico_data, "light");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.manchete)}</title>
<style>
:root{--ink:#0a1f44;--green:#00c281;--teal:#17b3c9;--blue:#1a5fd0;--bg:#eef2f7;--card:#fff;--line:#e2e8f2;--text:#16233d;--muted:#5d6f8e;--muted2:#8494ad;--grad:linear-gradient(90deg,#1a5fd0,#00c281)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 "Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:0 24px}
h1,h2{margin:0;font-weight:800;letter-spacing:-.01em;text-wrap:balance}
@media print{body{background:#fff}}
header.hero{background:radial-gradient(120% 140% at 85% 0%,#16386e 0%,var(--ink) 55%);color:#fff;padding:34px 0 40px}
.brand{display:flex;align-items:center;gap:11px;margin-bottom:26px}
.logo{display:flex;align-items:flex-end;gap:3px;height:26px}.logo i{display:block;width:6px;border-radius:2px}
.logo i:nth-child(1){height:12px;background:#2a72e0}.logo i:nth-child(2){height:19px;background:#12b0c8}.logo i:nth-child(3){height:26px;background:#00c281}
.bt{font-weight:800;font-size:16px}.bt small{display:block;font-weight:500;font-size:9.5px;letter-spacing:.32em;color:#9fb2d4;margin-top:1px}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--green)}
header.hero h1{font-size:29px;line-height:1.14;margin:11px 0 13px}
header.hero p.sub{color:#c6d4ea;font-size:15.5px;margin:0;max-width:64ch}
.headline{display:flex;flex-wrap:wrap;align-items:baseline;gap:16px;margin-top:26px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px 24px}
.big{font-size:52px;font-weight:800;line-height:1;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;flex:none}
.cap{color:#c6d4ea;font-size:14px;line-height:1.5;flex:1;min-width:220px}
.period{margin-top:18px;font-size:12.5px;color:#9fb2d4}.period b{color:#fff;font-weight:600}
section{padding:30px 0}section+section{border-top:1px solid var(--line)}
.kicker{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:8px}
.lead{color:var(--muted);font-size:14.5px;line-height:1.65}
.chartcard{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.srcs{font-size:12px;color:var(--muted);line-height:1.7;padding:26px 0}.srcs b{color:var(--text)}
footer{padding:20px 0 46px;color:var(--muted2);font-size:11.5px;border-top:1px solid var(--line)}
@media(max-width:640px){header.hero h1{font-size:23px}.big{font-size:40px}}
</style></head>
<body>
<header class="hero"><div class="wrap">
  <div class="brand"><span class="logo"><i></i><i></i><i></i></span><span class="bt">Instituto&nbsp;i10<small>RADAR DE MERCADO</small></span></div>
  <div class="eyebrow">Inteligência de mercado · Compras públicas${flag}</div>
  <h1>${esc(s.manchete)}</h1>
  <p class="sub">${esc(s.sacada)}</p>
  <div class="headline">${big ? `<div class="big">${esc(big)}</div>` : ""}<div class="cap">${esc(s.numero_ancora)}</div></div>
  <div class="period"><b>${esc(s.dia)}</b> · fonte primária: base i10 / PNCP (nacional)</div>
</div></header>
${chart ? `<section><div class="wrap"><div class="kicker">O gráfico</div><div class="chartcard">${chart}</div></div></section>` : ""}
${sec("Por que importa", s.e_dai)}
${sec("Ângulo de conteúdo", s.angulo)}
${sec("Método", s.metodo)}
${s.fonte ? `<div class="wrap"><div class="srcs"><b>Fontes &amp; ressalvas.</b> ${esc(s.fonte)}</div></div>` : ""}
<div class="wrap"><footer>Gerado pela Central de Agentes i10 · confira as ressalvas antes de publicar · institutoi10.com.br</footer></div>
</body></html>`;
}
