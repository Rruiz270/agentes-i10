import { currentUser, canSeeAgentes } from "@/lib/auth";
import { loadSacadaByDia } from "@/lib/fleet-data";
import { sacadaHtml } from "@/lib/sacada-html";

export const dynamic = "force-dynamic";

// Serve UMA sacada como HTML no estilo relatório i10 (fora do layout escuro do
// painel). É o que abre quando você clica num dia do calendário da aba Mercado.
export async function GET(_req: Request, ctx: { params: Promise<{ dia: string }> }) {
  const me = await currentUser();
  if (!me || !canSeeAgentes(me.role)) return new Response("Faça login no painel.", { status: 401 });

  const { dia } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return new Response("data inválida", { status: 400 });
  const s = await loadSacadaByDia(dia);
  if (!s) return new Response("Nenhuma sacada nesse dia.", { status: 404 });

  const diaFmt = new Date(dia + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  const html = sacadaHtml({
    dia: diaFmt, manchete: s.manchete, numero_ancora: s.numero_ancora, sacada: s.sacada,
    e_dai: s.e_dai, angulo: s.angulo, metodo: s.metodo, fonte: s.fonte, confianca: s.confianca, grafico_data: s.grafico_data,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
