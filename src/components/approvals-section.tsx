import { approveApproval, rejectApproval } from "@/app/actions";
import type { Approval } from "@/lib/fleet-data";

export default function ApprovalsSection({ approvals }: { approvals: Approval[] }) {
  return (
    <section id="aprovacoes" className="ap-sec">
      <h2 className="ap-h2">
        <span className="ap-h2-glow" />CENTRAL DE APROVAÇÕES
        {approvals.length ? <span className="ap-count">{approvals.length} aguardando você</span> : null}
      </h2>
      <p className="ap-note">O que os agentes prepararam. Revise, edite, e aprove — nada sai sem seu OK.</p>
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
      <p className="ap-foot">fonte <code>reserva.agent_runs</code> · publicado pelo Mac mini · Central de Agentes i10</p>
    </section>
  );
}
