import { approveApproval, rejectApproval } from "@/app/actions";
import type { Approval } from "@/lib/fleet-data";
import { agentAnchor } from "@/lib/anchor";

const VERD: Record<string, { label: string; cls: string; icon: string }> = {
  aprovado: { label: "aprovado pelo júri", cls: "ok", icon: "✅" },
  ressalva: { label: "passou com ressalva", cls: "mid", icon: "⚠️" },
};
const JURADOS = [
  { n: "Vera", i: "⚖️", l: "Correção & Realidade" },
  { n: "Rui", i: "🔍", l: "Risco" },
  { n: "Vânia", i: "💎", l: "Valor & Impacto" },
  { n: "Sena", i: "🧑‍⚖️", l: "Juíza-chefe · síntese" },
];

function JuriSelo({ a }: { a: Approval }) {
  if (!a.juri_verdict) return <div className="ju-selo pend">⏳ sob julgamento do júri…</div>;
  const v = VERD[a.juri_verdict] ?? VERD.ressalva;
  const p = a.juri_parecer;
  return (
    <details className="ju-selo">
      <summary>
        <span className={`ju-badge ${v.cls}`}>{v.icon} {v.label}</span>
        {typeof a.juri_score === "number" && <span className="ju-nota">nota {a.juri_score}/10</span>}
        <span className="ju-por">julgado por {a.juri_by ?? "Vera · Rui · Vânia · Sena"}</span>
      </summary>
      {p && (
        <div className="ju-body">
          {p.sintese && <p className="ju-sintese">🧑‍⚖️ <b>Sena:</b> {p.sintese}</p>}
          <div className="ju-lentes">
            {p.vera?.parecer && <div className="ju-lente"><b>⚖️ Vera</b> <i>{p.vera.nota}/10</i> — {p.vera.parecer}</div>}
            {p.rui?.parecer && <div className="ju-lente"><b>🔍 Rui</b> <i>{p.rui.nota}/10</i> — {p.rui.parecer}</div>}
            {p.vania?.parecer && <div className="ju-lente"><b>💎 Vânia</b> <i>{p.vania.nota}/10</i> — {p.vania.parecer}</div>}
          </div>
        </div>
      )}
    </details>
  );
}

export default function ApprovalsSection({ approvals }: { approvals: Approval[] }) {
  // Agrupa por agente (chunks contíguos) mantendo ordem estável dentro de cada um,
  // pra o botão "X aguardando você" pousar no chunk certo.
  const grouped = [...approvals].sort((a, b) => a.agent.localeCompare(b.agent, "pt-BR"));
  const seen = new Set<string>();
  return (
    <section id="aprovacoes" className="ap-sec">
      <h2 className="ap-h2">
        <span className="ap-h2-glow" />CENTRAL DE APROVAÇÕES
        {approvals.length ? <span className="ap-count">{approvals.length} aguardando você</span> : null}
      </h2>
      <p className="ap-note">O que os agentes prepararam — já <b>julgado por um painel de IA</b> antes de chegar a você. O que o júri vetou nem aparece aqui (fica no Histórico).</p>
      <div className="ju-painel">
        <span className="ju-painel-t">PAINEL DO JÚRI</span>
        {JURADOS.map((j) => (
          <span className="ju-player" key={j.n}><b>{j.i} {j.n}</b> {j.l}</span>
        ))}
      </div>
      {grouped.length === 0 ? (
        <div className="ap-empty">✓ Nenhuma ação aguardando aprovação.</div>
      ) : (
        <div className="ap-list">
          {grouped.map((a) => {
            const first = !seen.has(a.agent);
            if (first) seen.add(a.agent);
            return (
            <form key={a.id} id={first ? agentAnchor(a.agent) : undefined} className={`ap-card ${a.kind}`}>
              <input type="hidden" name="id" value={a.id} />
              <div className="ap-top">
                <span className="ap-agent">{a.agent}</span>
                <span className={`ap-chip ${a.kind}`}>{a.kind === "externo" ? "PRA FORA" : "INTERNO"}</span>
                {a.channel && <span className="ap-chip chan">{a.channel}</span>}
              </div>
              <div className="ap-title">{a.title}</div>
              {a.target && <div className="ap-target">{a.target}</div>}
              {a.reason && <div className="ap-reason">{a.reason}</div>}
              <JuriSelo a={a} />
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
            );
          })}
        </div>
      )}
      <p className="ap-foot">fonte <code>reserva.agent_runs</code> · publicado pelo Mac mini · Central de Agentes i10</p>
    </section>
  );
}
