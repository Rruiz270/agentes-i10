import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes } from "@/lib/auth";
import { sql } from "@/lib/db";
import { approveApproval, rejectApproval, logout } from "./actions";
import CommandCenter, { type Unit, type Tel } from "@/components/command-center";

export const dynamic = "force-dynamic";

type Run = { projeto: string; tarefa: string; status: string; summary: string | null; host: string | null; ts: string };
type Approval = { id: string; agent: string; kind: string; channel: string | null; title: string; target: string | null; reason: string | null; message: string | null };

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
    SELECT projeto, tarefa, status, summary, ts FROM reserva.agent_runs ORDER BY ts DESC LIMIT 14
  `) as Run[];
  const approvals = (await sql`
    SELECT id, agent, kind, channel, title, target, reason, message
    FROM reserva.agent_approvals WHERE status = 'pending' ORDER BY created_at
  `) as Approval[];

  const crmHealth = board.find((b) => b.projeto === "crm-marketing" && b.tarefa === "health");
  const fails = board.filter((b) => b.status === "FAIL").length;
  const pendBy = (a: string) => approvals.filter((x) => x.agent === a).length;
  const lastAgo = feed[0] ? timeAgo(feed[0].ts) : "—";

  const units: Unit[] = [
    { key: "guardiao", code: "GD", name: "Guardião", role: "Sentinela de código do CRM",
      autonomy: "ATIVO", state: crmHealth?.status === "FAIL" ? "alerta" : crmHealth ? "vigiando" : "ocioso",
      accent: crmHealth?.status === "FAIL" ? "danger" : "cyan", pending: 0, last: crmHealth?.summary ?? "sem sinal ainda" },
    { key: "cobranca", code: "CB", name: "Cobrança Interna", role: "Cobra pendências do time",
      autonomy: "APRENDIZ", state: pendBy("Cobrança interna") ? "aguardando" : "vigiando",
      accent: "mint", pending: pendBy("Cobrança interna"), last: "tarefas vencidas por dono" },
    { key: "leads", code: "LR", name: "Leads sem Resposta", role: "Reengaja leads no WhatsApp",
      autonomy: "APRENDIZ", state: pendBy("Leads sem resposta") ? "aguardando" : "vigiando",
      accent: "amber", pending: pendBy("Leads sem resposta"), last: "follow-ups preparados" },
    { key: "higiene", code: "HF", name: "Higiene do Funil", role: "Cuida de cards órfãos",
      autonomy: "APRENDIZ", state: pendBy("Higiene do funil") ? "aguardando" : "vigiando",
      accent: "violet", pending: pendBy("Higiene do funil"), last: "cards órfãos detectados" },
    { key: "pauta", code: "PM", name: "Pauta de Marketing", role: "Sugere a pauta da semana",
      autonomy: "APRENDIZ", state: pendBy("Pauta de marketing") ? "aguardando" : "vigiando",
      accent: "cyan", pending: pendBy("Pauta de marketing"), last: "posts sugeridos" },
    { key: "supervisor", code: "SV", name: "Supervisor HQ", role: "Orquestra e reporta a frota",
      autonomy: "ATIVO", state: "vigiando", accent: "mint", pending: 0, last: "briefing 08:00" },
  ];

  const tel: Tel[] = feed.map((r) => ({
    t: hhmm(r.ts), tag: r.status, cls: TELCLS[r.status] ?? "skip",
    text: `${r.projeto}/${r.tarefa} — ${r.summary ?? "—"}`,
  }));

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <CommandCenter units={units} tel={tel} online={units.length} fails={fails} pending={approvals.length} lastAgo={lastAgo} />

      <section id="aprovacoes" className="ap-sec">
        <h2 className="ap-h2">
          <span className="ap-h2-glow" />CENTRAL DE APROVAÇÕES
          {approvals.length ? <span className="ap-count">{approvals.length} aguardando você</span> : null}
        </h2>
        <p className="ap-note">
          O que os agentes prepararam. Revise, edite, e aprove — nada sai sem seu OK. Aprovar registra a decisão;
          o disparo real (WhatsApp/e-mail) entra quando os agentes forem ligados aos canais.
        </p>
        {approvals.length === 0 ? (
          <div className="ap-empty">✓ Nenhuma ação aguardando aprovação.</div>
        ) : (
          <div className="ap-list">
            {approvals.map((a) => (
              <form key={a.id} className={`ap-card ${a.kind}`}>
                <input type="hidden" name="id" value={a.id} />
                <div className="ap-top">
                  <span className="ap-agent">{a.agent}</span>
                  <span className={`ap-chip ${a.kind}`}>{a.kind === "externo" ? "PRA FORA" : "INTERNO"}</span>
                  {a.channel && <span className="ap-chip chan">{a.channel}</span>}
                </div>
                <div className="ap-title">{a.title}</div>
                {a.target && <div className="ap-target">Para: {a.target}</div>}
                {a.reason && <div className="ap-reason">{a.reason}</div>}
                <details className="ap-drawer">
                  <summary>ver e editar a mensagem preparada</summary>
                  <textarea name="message" defaultValue={a.message ?? ""} rows={5} />
                </details>
                <div className="ap-actions">
                  <button className="ap-btn ok" formAction={approveApproval}>
                    {a.kind === "externo" ? "Aprovar e enviar" : "Aprovar e aplicar"}
                  </button>
                  <button className="ap-btn no" formAction={rejectApproval}>Recusar</button>
                </div>
              </form>
            ))}
          </div>
        )}
        <p className="ap-foot">Somente leitura na frota · fonte <code>reserva.agent_runs</code> · publicado pelo Mac mini · Central de Agentes i10</p>
      </section>
    </main>
  );
}
