import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes } from "@/lib/auth";
import { sql } from "@/lib/db";
import { approveApproval, rejectApproval, logout } from "./actions";
import CommandCenter, { type Unit, type Fleet, type Tel } from "@/components/command-center";

export const dynamic = "force-dynamic";

type Run = { projeto: string; tarefa: string; status: string; summary: string | null; host: string | null; ts: string };
type Approval = {
  id: string; agent: string; kind: string; channel: string | null; title: string;
  target: string | null; reason: string | null; message: string | null; projeto: string;
};

const TELCLS: Record<string, string> = { PASS: "ok", WARN: "warn", FAIL: "fail", SKIP: "skip" };

function hhmm(ts: string): string {
  try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }); }
  catch { return "--:--"; }
}
function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)}s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}

export default async function Page() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const board = (await sql`
    SELECT DISTINCT ON (projeto, tarefa) projeto, tarefa, status, summary, host, ts
    FROM reserva.agent_runs ORDER BY projeto, tarefa, ts DESC
  `) as Run[];
  const feed = (await sql`
    SELECT projeto, tarefa, status, summary, ts FROM reserva.agent_runs ORDER BY ts DESC LIMIT 16
  `) as Run[];
  const approvals = (await sql`
    SELECT id, agent, kind, channel, title, target, reason, message, projeto
    FROM reserva.agent_approvals WHERE status = 'pending' ORDER BY projeto, created_at
  `) as Approval[];

  const fails = board.filter((b) => b.status === "FAIL").length;
  const pendBy = (a: string) => approvals.filter((x) => x.agent === a).length;
  const lastAgo = feed[0] ? timeAgo(feed[0].ts) : "—";
  const run = (proj: string, tarefa: string) => board.find((b) => b.projeto === proj && b.tarefa === tarefa);
  const crmHealth = run("crm-marketing", "health");

  const crmUnits: Unit[] = [
    { key: "guardiao", code: "GD", name: "Guardião", role: "Sentinela de código do CRM", autonomy: "ATIVO",
      state: crmHealth?.status === "FAIL" ? "alerta" : crmHealth ? "vigiando" : "ocioso",
      accent: crmHealth?.status === "FAIL" ? "danger" : "cyan", pending: 0, last: crmHealth?.summary ?? "sem sinal",
      acts: ["varrendo typecheck", "analisando lint", "validando schema Neon", "aguardando ciclo"] },
    { key: "cobranca", code: "CB", name: "Cobrança Interna", role: "Cobra pendências do time", autonomy: "APRENDIZ",
      state: pendBy("Cobrança interna") ? "aguardando" : "vigiando", accent: "mint", pending: pendBy("Cobrança interna"),
      last: "tarefas vencidas", acts: ["cruzando tarefas vencidas", "montando lembretes", "notificando o time", "aguardando seu OK"] },
    { key: "leads", code: "LR", name: "Leads sem Resposta", role: "Reengaja leads no WhatsApp", autonomy: "APRENDIZ",
      state: pendBy("Leads sem resposta") ? "aguardando" : "vigiando", accent: "amber", pending: pendBy("Leads sem resposta"),
      last: "follow-ups", acts: ["lendo conversas WhatsApp", "detectando silêncios >48h", "redigindo follow-up", "aguardando seu OK"] },
    { key: "higiene", code: "HF", name: "Higiene do Funil", role: "Cuida de cards órfãos", autonomy: "APRENDIZ",
      state: pendBy("Higiene do funil") ? "aguardando" : "vigiando", accent: "violet", pending: pendBy("Higiene do funil"),
      last: "cards órfãos", acts: ["escaneando pool 'Novo'", "medindo rotDays", "propondo distribuição", "aguardando seu OK"] },
    { key: "pauta", code: "PM", name: "Pauta de Marketing", role: "Sugere a pauta da semana", autonomy: "APRENDIZ",
      state: pendBy("Pauta de marketing") ? "aguardando" : "vigiando", accent: "cyan", pending: pendBy("Pauta de marketing"),
      last: "campanhas", acts: ["lendo engajamento", "consultando calendário", "rascunhando pauta", "aguardando seu OK"] },
    { key: "supervisor", code: "SV", name: "Supervisor HQ", role: "Orquestra e reporta a frota", autonomy: "ATIVO",
      state: "vigiando", accent: "mint", pending: 0, last: "briefing 08:00",
      acts: ["coletando STATUS", "consolidando sinais", "montando briefing", "em vigília"] },
  ];

  const ing = run("licita360", "ingestao"), ed = run("licita360", "editais");
  const licitaUnits: Unit[] = [
    { key: "lic-ing", code: "IG", name: "Coleta / Ingestão", role: "Vigia o cron do PNCP", autonomy: "ATIVO",
      state: ing?.status === "FAIL" ? "alerta" : ing ? "vigiando" : "ocioso",
      accent: ing?.status === "FAIL" ? "danger" : "cyan", pending: pendBy("Coleta / Ingestão"),
      last: ing?.summary ?? "sem sinal", acts: ["lendo log de coletas", "conferindo frescor do PNCP", "checando erros", "aguardando ciclo"] },
    { key: "lic-radar", code: "RD", name: "Radar de oportunidades", role: "Caça licitações de educação", autonomy: "APRENDIZ",
      state: pendBy("Radar de oportunidades") ? "aguardando" : "vigiando", accent: "mint", pending: pendBy("Radar de oportunidades"),
      last: "oportunidades", acts: ["varrendo 3,2M licitações", "filtrando temas i10 (FUNDEB/educação)", "medindo valor e prazo", "aguardando seu OK"] },
    { key: "lic-prazos", code: "PZ", name: "Prazos", role: "Não perder deadline", autonomy: "APRENDIZ",
      state: pendBy("Prazos") ? "aguardando" : "vigiando", accent: "amber", pending: pendBy("Prazos"),
      last: "prazos chegando", acts: ["medindo prazos de proposta", "priorizando por urgência", "sinalizando o que fecha", "aguardando seu OK"] },
    { key: "lic-editais", code: "ED", name: "Leitura de editais", role: "IA lê o edital em PDF", autonomy: "ATIVO",
      state: ed?.status === "WARN" ? "trabalhando" : ed ? "vigiando" : "ocioso", accent: "violet", pending: pendBy("Leitura de editais"),
      last: ed?.summary ?? "fila de análise", acts: ["contando a fila de editais", "priorizando por prazo", "extraindo objeto/exigências", "aguardando ciclo"] },
  ];

  const fleets: Fleet[] = [
    { code: "CRM", label: "CRM i10", sub: "captação · funil · marketing", units: crmUnits },
    { code: "LIC", label: "Licita360", sub: "radar nacional de licitações", units: licitaUnits },
  ];

  const online = crmUnits.length + licitaUnits.length;
  const tel: Tel[] = feed.map((r) => ({
    t: hhmm(r.ts), tag: r.status, cls: TELCLS[r.status] ?? "skip",
    text: `${r.projeto}/${r.tarefa} — ${r.summary ?? "—"}`,
  }));

  const projLabel = (p: string) => (p === "licita360" ? "Licita360" : "CRM");

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <CommandCenter fleets={fleets} tel={tel} online={online} fails={fails} pending={approvals.length} lastAgo={lastAgo} />

      <section id="aprovacoes" className="ap-sec">
        <h2 className="ap-h2">
          <span className="ap-h2-glow" />CENTRAL DE APROVAÇÕES
          {approvals.length ? <span className="ap-count">{approvals.length} aguardando você</span> : null}
        </h2>
        <p className="ap-note">
          O que os agentes dos 2 projetos prepararam. Revise, edite, e aprove — nada sai sem seu OK.
        </p>
        {approvals.length === 0 ? (
          <div className="ap-empty">✓ Nenhuma ação aguardando aprovação.</div>
        ) : (
          <div className="ap-list">
            {approvals.map((a) => (
              <form key={a.id} className={`ap-card ${a.kind}`}>
                <input type="hidden" name="id" value={a.id} />
                <div className="ap-top">
                  <span className={`ap-proj ${a.projeto === "licita360" ? "lic" : "crm"}`}>{projLabel(a.projeto)}</span>
                  <span className="ap-agent">{a.agent}</span>
                  <span className={`ap-chip ${a.kind}`}>{a.kind === "externo" ? "PRA FORA" : "INTERNO"}</span>
                  {a.channel && <span className="ap-chip chan">{a.channel}</span>}
                </div>
                <div className="ap-title">{a.title}</div>
                {a.target && <div className="ap-target">{a.target}</div>}
                {a.reason && <div className="ap-reason">{a.reason}</div>}
                <details className="ap-drawer">
                  <summary>ver e editar</summary>
                  <textarea name="message" defaultValue={a.message ?? ""} rows={5} />
                </details>
                <div className="ap-actions">
                  <button className="ap-btn ok" formAction={approveApproval}>
                    {a.kind === "externo" ? "Aprovar e enviar" : "Aprovar"}
                  </button>
                  <button className="ap-btn no" formAction={rejectApproval}>Recusar</button>
                </div>
              </form>
            ))}
          </div>
        )}
        <p className="ap-foot">Frota multi-projeto · fonte <code>reserva.agent_runs</code> · publicado pelo Mac mini · Central de Agentes i10</p>
      </section>
    </main>
  );
}
