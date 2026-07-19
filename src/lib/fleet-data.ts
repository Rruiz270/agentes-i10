import { sql } from "@/lib/db";
import type { Unit, Tel } from "@/components/command-center";

export type Run = { projeto: string; tarefa: string; status: string; summary: string | null; host: string | null; ts: string };
export type Approval = {
  id: string; agent: string; kind: string; channel: string | null; title: string;
  target: string | null; reason: string | null; message: string | null; projeto: string;
};

const TELCLS: Record<string, string> = { PASS: "ok", WARN: "warn", FAIL: "fail", SKIP: "skip" };
const CRM_PROJS = ["crm", "crm-marketing", "hq-supervisor"];

export function hhmm(ts: string): string {
  try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }); }
  catch { return "--:--"; }
}
export function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)}s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}

export type Insights = {
  trends: { mes: string; n: number }[];
  valor: { licitacoes: number; total_milhoes: number; media: number };
  ranking: { orgao: string; uf: string; n: number }[];
  concorrencia: { fornecedor: string; contratos: number; milhoes: number }[];
  updated: string;
} | null;

export async function loadInsights(projeto: string): Promise<Insights> {
  const rows = (await sql`SELECT data FROM reserva.project_insights WHERE projeto = ${projeto}`) as { data: Insights }[];
  return rows[0]?.data ?? null;
}

export async function loadAll() {
  const board = (await sql`
    SELECT DISTINCT ON (projeto, tarefa) projeto, tarefa, status, summary, host, ts
    FROM reserva.agent_runs ORDER BY projeto, tarefa, ts DESC`) as Run[];
  const feed = (await sql`
    SELECT projeto, tarefa, status, summary, ts FROM reserva.agent_runs ORDER BY ts DESC LIMIT 30`) as Run[];
  const approvals = (await sql`
    SELECT id, agent, kind, channel, title, target, reason, message, projeto
    FROM reserva.agent_approvals WHERE status = 'pending' ORDER BY projeto, created_at`) as Approval[];
  return { board, feed, approvals };
}

const runOf = (board: Run[], proj: string, tarefa: string) =>
  board.find((b) => b.projeto === proj && b.tarefa === tarefa);
const pendByAgent = (approvals: Approval[], a: string) => approvals.filter((x) => x.agent === a).length;

export function crmUnits(board: Run[], approvals: Approval[]): Unit[] {
  const h = runOf(board, "crm-marketing", "health");
  const p = (a: string) => pendByAgent(approvals, a);
  return [
    { key: "guardiao", code: "GD", name: "Guardião", role: "Sentinela de código do CRM", autonomy: "ATIVO",
      state: h?.status === "FAIL" ? "alerta" : h ? "vigiando" : "ocioso", accent: h?.status === "FAIL" ? "danger" : "cyan",
      pending: 0, last: h?.summary ?? "sem sinal", acts: ["varrendo typecheck", "analisando lint", "validando schema Neon", "aguardando ciclo"] },
    { key: "cobranca", code: "CB", name: "Cobrança Interna", role: "Cobra pendências do time", autonomy: "APRENDIZ",
      state: p("Cobrança interna") ? "aguardando" : "vigiando", accent: "mint", pending: p("Cobrança interna"),
      last: "tarefas vencidas", acts: ["cruzando tarefas vencidas", "montando lembretes", "notificando o time", "aguardando seu OK"] },
    { key: "leads", code: "LR", name: "Leads sem Resposta", role: "Reengaja leads no WhatsApp", autonomy: "APRENDIZ",
      state: p("Leads sem resposta") ? "aguardando" : "vigiando", accent: "amber", pending: p("Leads sem resposta"),
      last: "follow-ups", acts: ["lendo conversas WhatsApp", "detectando silêncios >48h", "redigindo follow-up", "aguardando seu OK"] },
    { key: "higiene", code: "HF", name: "Higiene do Funil", role: "Cuida de cards órfãos", autonomy: "APRENDIZ",
      state: p("Higiene do funil") ? "aguardando" : "vigiando", accent: "violet", pending: p("Higiene do funil"),
      last: "cards órfãos", acts: ["escaneando pool 'Novo'", "medindo rotDays", "propondo distribuição", "aguardando seu OK"] },
    { key: "pauta", code: "PM", name: "Pauta de Marketing", role: "Sugere a pauta da semana", autonomy: "APRENDIZ",
      state: p("Pauta de marketing") ? "aguardando" : "vigiando", accent: "cyan", pending: p("Pauta de marketing"),
      last: "campanhas", acts: ["lendo engajamento", "consultando calendário", "rascunhando pauta", "aguardando seu OK"] },
    { key: "supervisor", code: "SV", name: "Supervisor HQ", role: "Orquestra e reporta a frota", autonomy: "ATIVO",
      state: "vigiando", accent: "mint", pending: 0, last: "briefing 08:00",
      acts: ["coletando STATUS", "consolidando sinais", "montando briefing", "em vigília"] },
  ];
}

export function licitaUnits(board: Run[], approvals: Approval[]): Unit[] {
  const ing = runOf(board, "licita360", "ingestao"), ed = runOf(board, "licita360", "editais"), sd = runOf(board, "licita360", "saude");
  const p = (a: string) => pendByAgent(approvals, a);
  return [
    { key: "lic-ing", code: "IG", name: "Coleta / Ingestão", role: "Vigia o cron do PNCP", autonomy: "ATIVO",
      state: ing?.status === "FAIL" ? "alerta" : ing ? "vigiando" : "ocioso", accent: ing?.status === "FAIL" ? "danger" : "cyan",
      pending: p("Coleta / Ingestão"), last: ing?.summary ?? "sem sinal", acts: ["lendo log de coletas", "conferindo frescor do PNCP", "checando erros", "aguardando ciclo"] },
    { key: "lic-saude", code: "DB", name: "Saúde do banco", role: "Controla o Neon do Licita360", autonomy: "ATIVO",
      state: sd?.status === "FAIL" || sd?.status === "WARN" ? "alerta" : sd ? "vigiando" : "ocioso", accent: sd?.status === "FAIL" ? "danger" : "mint",
      pending: p("Saúde do banco"), last: sd?.summary ?? "3,2M licitações", acts: ["contando o total de licitações", "medindo crescimento 24h", "checando fontes paradas", "aguardando ciclo"] },
    { key: "lic-radar", code: "RD", name: "Radar de oportunidades", role: "Caça licitações de educação", autonomy: "APRENDIZ",
      state: p("Radar de oportunidades") ? "aguardando" : "vigiando", accent: "mint", pending: p("Radar de oportunidades"),
      last: "oportunidades", acts: ["varrendo 3,2M licitações", "filtrando temas i10 (FUNDEB/educação)", "medindo valor e prazo", "aguardando seu OK"] },
    { key: "lic-prazos", code: "PZ", name: "Prazos", role: "Não perder deadline", autonomy: "APRENDIZ",
      state: p("Prazos") ? "aguardando" : "vigiando", accent: "amber", pending: p("Prazos"),
      last: "prazos chegando", acts: ["medindo prazos de proposta", "priorizando por urgência", "sinalizando o que fecha", "aguardando seu OK"] },
    { key: "lic-editais", code: "ED", name: "Leitura de editais", role: "IA lê o edital em PDF", autonomy: "ATIVO",
      state: ed?.status === "WARN" ? "trabalhando" : ed ? "vigiando" : "ocioso", accent: "violet", pending: p("Leitura de editais"),
      last: ed?.summary ?? "fila de análise", acts: ["contando a fila de editais", "priorizando por prazo", "extraindo objeto/exigências", "aguardando ciclo"] },
  ];
}

export function telFor(feed: Run[], projs: string[]): Tel[] {
  return feed.filter((r) => projs.includes(r.projeto)).slice(0, 16).map((r) => ({
    t: hhmm(r.ts), tag: r.status, cls: TELCLS[r.status] ?? "skip", text: `${r.projeto}/${r.tarefa} — ${r.summary ?? "—"}`,
  }));
}

export type Summary = {
  key: "crm" | "licita"; code: string; label: string; sub: string; href: string;
  status: "ok" | "warn" | "fail"; statusLabel: string; pending: number; units: number;
  bullets: { sev: "fail" | "warn" | "info"; text: string }[];
};

export function summaryFor(kind: "crm" | "licita", board: Run[], approvals: Approval[]): Summary {
  const projs = kind === "crm" ? CRM_PROJS : ["licita360"];
  const units = kind === "crm" ? crmUnits(board, approvals) : licitaUnits(board, approvals);
  const appr = approvals.filter((a) => (kind === "crm" ? a.projeto === "crm" : a.projeto === "licita360"));
  const fails = board.filter((b) => projs.includes(b.projeto) && b.status === "FAIL");
  const status = fails.length ? "fail" : appr.length ? "warn" : "ok";
  const statusLabel = fails.length ? "Atenção" : appr.length ? "Ação pendente" : "Tudo verde";

  const bullets: Summary["bullets"] = [];
  for (const f of fails.slice(0, 1)) bullets.push({ sev: "fail", text: `${f.tarefa}: ${f.summary ?? "falhou"}` });
  // agrupa aprovações por agente (top 3 por volume)
  const byAgent = new Map<string, number>();
  for (const a of appr) byAgent.set(a.agent, (byAgent.get(a.agent) ?? 0) + 1);
  [...byAgent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([agent, n]) =>
    bullets.push({ sev: "warn", text: `${agent}: ${n} aguardando` }));
  if (!bullets.length) bullets.push({ sev: "info", text: "tudo em dia, nada aguardando você" });

  return {
    key: kind, code: kind === "crm" ? "CRM" : "LIC",
    label: kind === "crm" ? "CRM i10" : "Licita360",
    sub: kind === "crm" ? "captação · funil · marketing" : "radar nacional de licitações",
    href: kind === "crm" ? "/crm" : "/licita",
    status, statusLabel, pending: appr.length, units: units.length, bullets,
  };
}
