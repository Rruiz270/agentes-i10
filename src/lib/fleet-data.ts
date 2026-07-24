import { sql } from "@/lib/db";
import type { Unit, Tel } from "@/components/command-center";

export type Run = { projeto: string; tarefa: string; status: string; summary: string | null; host: string | null; ts: string };
export type JuriLente = { nota: number | null; parecer: string };
export type JuriParecer = { sintese: string; vera: JuriLente; rui: JuriLente; vania: JuriLente } | null;
export type Approval = {
  id: string; agent: string; kind: string; channel: string | null; title: string;
  target: string | null; reason: string | null; message: string | null; projeto: string;
  juri_verdict: string | null; juri_score: number | null; juri_parecer: JuriParecer; juri_by: string | null;
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
  concorrencia: { fornecedor: string; contratos: number; total: number }[];
  updated: string;
} | null;

export async function loadInsights(projeto: string): Promise<Insights> {
  const rows = (await sql`SELECT data FROM reserva.project_insights WHERE projeto = ${projeto}`) as { data: Insights }[];
  return rows[0]?.data ?? null;
}

export type ExecReview = { resumo: string; arquivos: string[]; risco: string; testar: string } | null;
export type ExecItem = {
  id: string; agent: string; projeto: string; title: string;
  exec_status: string; exec_pr: string | null; exec_log: string | null;
  exec_review: ExecReview; exec_preview: string | null; decided_by: string | null;
};
export async function loadExecucao(projeto: string): Promise<ExecItem[]> {
  return (await sql`
    SELECT id, agent, projeto, title, exec_status, exec_pr, exec_log, exec_review, exec_preview, decided_by
    FROM reserva.agent_approvals
    WHERE projeto = ${projeto} AND exec_status IS NOT NULL
    ORDER BY exec_updated_at DESC LIMIT 12
  `) as ExecItem[];
}

// ── Histórico / auditoria: toda decisão tomada, por quem, quando, desfecho ───
export type HistItem = {
  id: string; projeto: string; agent: string; channel: string | null; title: string;
  status: string; decided_by: string | null; decided_at: string | null;
  exec_status: string | null; exec_pr: string | null; send_status: string | null;
  juri_verdict: string | null; juri_score: number | null; juri_by: string | null;
  ts: string | null;
};
export async function loadHistorico(limit = 200): Promise<HistItem[]> {
  // ts = atividade mais recente do item (decisão, veto do júri, ou execução/deploy)
  // — assim o que você acabou de deployar sobe pro topo e vetado mostra a data certa.
  return (await sql`
    SELECT id, projeto, agent, channel, title, status, decided_by, decided_at,
           exec_status, exec_pr, send_status, juri_verdict, juri_score, juri_by,
           GREATEST(decided_at, juri_at, exec_updated_at) AS ts
    FROM reserva.agent_approvals
    WHERE status IN ('approved', 'rejected', 'vetado')
    ORDER BY GREATEST(decided_at, juri_at, exec_updated_at) DESC NULLS LAST LIMIT ${limit}
  `) as HistItem[];
}
export const execAtivo = (items: ExecItem[]) =>
  items.some((i) => ["queued", "executing", "deploying"].includes(i.exec_status));

export async function loadAll() {
  const board = (await sql`
    SELECT DISTINCT ON (projeto, tarefa) projeto, tarefa, status, summary, host, ts
    FROM reserva.agent_runs ORDER BY projeto, tarefa, ts DESC`) as Run[];
  const feed = (await sql`
    SELECT projeto, tarefa, status, summary, ts FROM reserva.agent_runs ORDER BY ts DESC LIMIT 30`) as Run[];
  const approvals = (await sql`
    SELECT id, agent, kind, channel, title, target, reason, message, projeto,
           juri_verdict, juri_score, juri_parecer, juri_by
    FROM reserva.agent_approvals
    WHERE status = 'pending' AND (severidade IS DISTINCT FROM 'critico')
    ORDER BY projeto, created_at`) as Approval[];
  return { board, feed, approvals };
}

// ── Críticos de Produção: o que AFETA O CLIENTE (dados zerados, página vazia) ─
export type Critico = { id: string; projeto: string; title: string; reason: string | null; channel: string | null };
export async function loadCriticos(projetos?: string[]): Promise<Critico[]> {
  const rows = (await sql`
    SELECT id, projeto, title, reason, channel
    FROM reserva.agent_approvals
    WHERE status = 'pending' AND severidade = 'critico'
    ORDER BY created_at DESC`) as Critico[];
  return projetos ? rows.filter((r) => projetos.includes(r.projeto)) : rows;
}

// ── Direção: o pulso do Chief-of-Staff + o dead-man switch da frota ──────────
export type Prioridade = { titulo: string; porque: string; dono: string; acao: string };
export type Escalacao = { titulo: string; porque: string };
export type Pulso = {
  pulso_em: string | null;
  resumo: string;
  prioridades: Prioridade[];
  escalacoes: Escalacao[];
  cfo: string;
  minAtras: number | null; // minutos desde o último sinal de QUALQUER agente (liveness)
};
export async function loadPulso(): Promise<Pulso> {
  const [p] = (await sql`SELECT pulso_em, resumo, prioridades FROM reserva.fleet_pulse WHERE id = 1`) as
    { pulso_em: string; resumo: string; prioridades: { prioridades?: Prioridade[]; escalacoes?: Escalacao[]; cfo?: string } | null }[];
  const [live] = (await sql`SELECT max(ts) AS ult FROM reserva.agent_runs`) as { ult: string | null }[];
  const minAtras = live?.ult ? Math.round((Date.now() - new Date(live.ult).getTime()) / 60000) : null;
  const j = p?.prioridades ?? {};
  return {
    pulso_em: p?.pulso_em ?? null,
    resumo: p?.resumo ?? "",
    prioridades: j.prioridades ?? [],
    escalacoes: j.escalacoes ?? [],
    cfo: j.cfo ?? "",
    minAtras,
  };
}
// A frota está OFFLINE se o ping de vida (a cada 5 min) sumiu há mais de 15 min.
export const FROTA_OFFLINE_MIN = 15;

// ── Relatório do Júri: o que o painel de IA aprovou, ressalvou ou vetou ──────
export type JuriRow = {
  id: string; projeto: string; agent: string; title: string;
  juri_verdict: string; juri_score: number | null; juri_parecer: JuriParecer;
  juri_at: string | null; status: string; decided_by: string | null;
};
export type JuriReport = {
  placar: { aprovado: number; ressalva: number; vetado: number };
  vetados: JuriRow[];
  ressalvas: JuriRow[];
};
export async function loadJuriReport(): Promise<JuriReport> {
  const counts = (await sql`
    SELECT juri_verdict AS v, count(*)::int n FROM reserva.agent_approvals
    WHERE juri_verdict IS NOT NULL GROUP BY juri_verdict`) as { v: string; n: number }[];
  const placar = { aprovado: 0, ressalva: 0, vetado: 0 };
  for (const c of counts) if (c.v in placar) (placar as Record<string, number>)[c.v] = c.n;
  const vetados = (await sql`
    SELECT id, projeto, agent, title, juri_verdict, juri_score, juri_parecer, juri_at, status, decided_by
    FROM reserva.agent_approvals WHERE status = 'vetado'
    ORDER BY juri_at DESC NULLS LAST LIMIT 100`) as JuriRow[];
  const ressalvas = (await sql`
    SELECT id, projeto, agent, title, juri_verdict, juri_score, juri_parecer, juri_at, status, decided_by
    FROM reserva.agent_approvals WHERE juri_verdict = 'ressalva' AND status IN ('pending', 'approved')
    ORDER BY juri_at DESC NULLS LAST LIMIT 50`) as JuriRow[];
  return { placar, vetados, ressalvas };
}

// ── Autonomia: Aprendiz → Autônomo por histórico de aprovações ──────────────
export type Stats = Map<string, { aprov: number; rej: number }>;
export async function loadStats(): Promise<Stats> {
  const rows = (await sql`
    SELECT projeto, agent,
      count(*) FILTER (WHERE status = 'approved')::int aprov,
      count(*) FILTER (WHERE status = 'rejected')::int rej
    FROM reserva.agent_approvals GROUP BY projeto, agent
  `) as { projeto: string; agent: string; aprov: number; rej: number }[];
  const m: Stats = new Map();
  for (const r of rows) m.set(`${r.projeto}|${r.agent}`, { aprov: r.aprov, rej: r.rej });
  return m;
}
// Externos (mandam pra prefeitura real) exigem barra mais alta.
const META_EXTERNO = new Set(["Leads sem resposta"]);
export const metaDe = (agent: string) => (META_EXTERNO.has(agent) ? 20 : 10);

// Aplica o nível real a cada unidade Aprendiz: mostra progresso X/meta e
// gradua pra Autônomo quando bate a meta. Unidades Ativo/Autônomo não mudam.
export function aplicarAutonomia(units: Unit[], projeto: string, stats: Stats): Unit[] {
  return units.map((u) => {
    if (u.autonomy !== "APRENDIZ") return u;
    const s = stats.get(`${projeto}|${u.name}`) ?? { aprov: 0, rej: 0 };
    const meta = metaDe(u.name);
    if (s.aprov >= meta) return { ...u, autonomy: "AUTÔNOMO", state: u.state === "vigiando" ? "trabalhando" : u.state };
    return { ...u, prog: { a: s.aprov, meta } };
  });
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
    { key: "lic-recompras", code: "RC", name: "Recompras previsíveis", role: "Antecipa a próxima licitação", autonomy: "APRENDIZ",
      state: p("Recompras previsíveis") ? "aguardando" : "vigiando", accent: "cyan", pending: p("Recompras previsíveis"),
      last: "órgãos recorrentes", acts: ["mapeando compradores recorrentes", "cruzando histórico 18m", "achando janelas fechadas", "aguardando seu OK"] },
    { key: "lic-preco", code: "PR", name: "Preço fora da curva", role: "Due diligence de preço", autonomy: "APRENDIZ",
      state: p("Preço fora da curva") ? "aguardando" : "vigiando", accent: "amber", pending: p("Preço fora da curva"),
      last: "itens vs mercado", acts: ["comparando itens vs mercado", "medindo desvio de preço", "filtrando erros de dado", "aguardando ciclo"] },
  ];
}

// Frota de Inovação/Melhoria — mesma pra todo projeto, escopada por projeto.
export function melhoriaUnits(projeto: string, approvals: Approval[]): Unit[] {
  const p = (a: string) => approvals.filter((x) => x.projeto === projeto && x.agent === a).length;
  return [
    { key: `${projeto}-eng`, code: "EN", name: "Engenheiro", role: "Melhora código & arquitetura", autonomy: "APRENDIZ",
      state: p("Engenheiro") ? "aguardando" : "vigiando", accent: "cyan", pending: p("Engenheiro"),
      last: "revisando o repo", acts: ["explorando a estrutura", "achando dívida técnica", "olhando segurança", "sugerindo melhorias"] },
    { key: `${projeto}-pd`, code: "PD", name: "Produto/Diferencial", role: "Diferencial competitivo", autonomy: "APRENDIZ",
      state: p("Produto/Diferencial") ? "aguardando" : "vigiando", accent: "mint", pending: p("Produto/Diferencial"),
      last: "oportunidades de produto", acts: ["lendo o que o sistema faz", "cruzando com o mercado", "achando diferenciais", "sugerindo features"] },
    { key: `${projeto}-ux`, code: "UX", name: "UX", role: "Experiência do usuário", autonomy: "APRENDIZ",
      state: p("UX") ? "aguardando" : "vigiando", accent: "amber", pending: p("UX"),
      last: "avaliando os fluxos", acts: ["mapeando os fluxos", "achando fricção", "checando estados/mobile", "sugerindo melhorias"] },
    { key: `${projeto}-ui`, code: "UI", name: "UI/Design", role: "Visual & acessibilidade", autonomy: "APRENDIZ",
      state: p("UI/Design") ? "aguardando" : "vigiando", accent: "violet", pending: p("UI/Design"),
      last: "avaliando o visual", acts: ["olhando consistência", "checando acessibilidade", "conferindo a marca i10", "sugerindo polish"] },
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
