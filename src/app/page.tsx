import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes } from "@/lib/auth";
import { sql } from "@/lib/db";
import { approveApproval, rejectApproval, logout } from "./actions";

export const dynamic = "force-dynamic";

type Run = {
  projeto: string;
  tarefa: string;
  status: string;
  summary: string | null;
  host: string | null;
  ts: string;
};

type Approval = {
  id: string;
  agent: string;
  kind: string;
  channel: string | null;
  title: string;
  target: string | null;
  reason: string | null;
  message: string | null;
};

const META: Record<string, { cls: string; label: string }> = {
  PASS: { cls: "ok", label: "ok" },
  WARN: { cls: "warn", label: "aviso" },
  FAIL: { cls: "fail", label: "falha" },
  SKIP: { cls: "skip", label: "pulado" },
};
const metaOf = (s: string) => META[s?.toUpperCase()] ?? META.SKIP;

function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)}s atrás`;
  if (s < 5400) return `${Math.round(s / 60)} min atrás`;
  if (s < 172800) return `${Math.round(s / 3600)} h atrás`;
  return `${Math.round(s / 86400)} d atrás`;
}

export default async function AgentesPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const board = (await sql`
    SELECT DISTINCT ON (projeto, tarefa) projeto, tarefa, status, summary, host, ts
    FROM reserva.agent_runs
    ORDER BY projeto, tarefa, ts DESC
  `) as Run[];

  const feed = (await sql`
    SELECT projeto, tarefa, status, summary, host, ts
    FROM reserva.agent_runs ORDER BY ts DESC LIMIT 25
  `) as Run[];

  const approvals = (await sql`
    SELECT id, agent, kind, channel, title, target, reason, message
    FROM reserva.agent_approvals WHERE status = 'pending' ORDER BY created_at
  `) as Approval[];

  const fails = board.filter((r) => r.status === "FAIL").length;
  const warns = board.filter((r) => r.status === "WARN").length;
  const health = fails ? "fail" : warns ? "warn" : board.length ? "ok" : "skip";
  const healthLabel = fails ? "Atenção" : warns ? "Avisos" : board.length ? "Tudo verde" : "Sem dados";
  const lastTs = feed[0]?.ts;

  return (
    <main className="ag">
      <div className="ag-topbar">
        <form action={logout}>
          <button className="ag-logout" type="submit">Sair ({me.name})</button>
        </form>
      </div>

      <h1 className="ag-h1">
        <span className="ag-logo"><i>i</i><b>10</b></span> Central de Agentes
      </h1>
      <div className="ag-sub">Frota do CRM i10 · publicado ao vivo pelo Mac mini</div>

      <div className="ag-strip">
        <div className="ag-cell"><div className="ag-k">Estado geral</div><div className="ag-v"><span className={`ag-dot ${health}`} /> {healthLabel}</div></div>
        <div className="ag-cell"><div className="ag-k">Tarefas monitoradas</div><div className="ag-v">{board.length}</div></div>
        <div className="ag-cell"><div className="ag-k">Falhas agora</div><div className="ag-v" style={{ color: fails ? "var(--danger-bd)" : undefined }}>{fails}</div></div>
        <div className="ag-cell"><div className="ag-k">Última atualização</div><div className="ag-v ag-small">{lastTs ? timeAgo(lastTs) : "—"}</div></div>
      </div>

      <h2 className="ag-h2">
        Central de Aprovações{approvals.length ? ` · ${approvals.length} aguardando você` : ""}
      </h2>
      <p className="ag-note">
        O que os agentes prepararam. Revise, edite se quiser, e aprove — nada sai sem seu OK. Aprovar
        registra a decisão; o disparo real (WhatsApp/e-mail) entra quando os agentes forem ligados aos canais.
      </p>
      {approvals.length === 0 ? (
        <div className="ag-empty">✔ Nada aguardando aprovação agora.</div>
      ) : (
        <div className="ag-aplist">
          {approvals.map((a) => (
            <form key={a.id} className={`ag-ap ${a.kind}`}>
              <input type="hidden" name="id" value={a.id} />
              <div className="ag-ap-h">
                <span className="ag-ap-agent">{a.agent}</span>
                <span className={`ag-chip ${a.kind}`}>{a.kind === "externo" ? "pra fora" : "interno"}</span>
                {a.channel && <span className="ag-chip chan">{a.channel}</span>}
              </div>
              <div className="ag-ap-title">{a.title}</div>
              {a.target && <div className="ag-ap-target">Para: {a.target}</div>}
              {a.reason && <div className="ag-ap-reason">{a.reason}</div>}
              <details className="ag-drawer">
                <summary>Ver e editar a mensagem preparada</summary>
                <textarea name="message" defaultValue={a.message ?? ""} rows={5} />
              </details>
              <div className="ag-ap-actions">
                <button className="ag-btn ok" formAction={approveApproval}>
                  {a.kind === "externo" ? "Aprovar e enviar" : "Aprovar e aplicar"}
                </button>
                <button className="ag-btn no" formAction={rejectApproval}>Recusar</button>
              </div>
            </form>
          ))}
        </div>
      )}

      <h2 className="ag-h2">Frota — último resultado de cada tarefa</h2>
      {board.length === 0 ? (
        <div className="ag-empty">Nenhuma execução publicada ainda.</div>
      ) : (
        <div className="ag-board">
          {board.map((r) => {
            const m = metaOf(r.status);
            return (
              <div className={`ag-card ${m.cls}`} key={`${r.projeto}/${r.tarefa}`}>
                <div className="ag-card-h">
                  <span className={`ag-dot ${m.cls}`} />
                  <span className="ag-task">{r.tarefa}</span>
                  <span className="ag-badge">{m.label}</span>
                </div>
                <div className="ag-proj">{r.projeto}</div>
                <div className="ag-summary">{r.summary ?? "—"}</div>
                <div className="ag-when">{timeAgo(r.ts)}{r.host ? ` · ${r.host}` : ""}</div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="ag-h2">Últimas execuções</h2>
      {feed.length === 0 ? (
        <div className="ag-empty">Sem histórico ainda.</div>
      ) : (
        <div className="ag-feedwrap">
          <table className="ag-feed">
            <thead><tr><th></th><th>Tarefa</th><th>Resumo</th><th>Quando</th></tr></thead>
            <tbody>
              {feed.map((r, i) => {
                const m = metaOf(r.status);
                return (
                  <tr key={i}>
                    <td><span className={`ag-dot ${m.cls}`} /></td>
                    <td className="ag-tcell">{r.projeto}/{r.tarefa}</td>
                    <td className="ag-scell">{r.summary ?? "—"}</td>
                    <td className="ag-wcell">{timeAgo(r.ts)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="ag-foot">
        Somente leitura · fonte <code>reserva.agent_runs</code> · Central de Agentes i10 · independente.
      </p>
    </main>
  );
}
