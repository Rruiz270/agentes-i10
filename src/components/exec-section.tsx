import { deployApproval } from "@/app/actions";
import type { ExecItem } from "@/lib/fleet-data";

const STATE: Record<string, { label: string; cls: string; icon: string }> = {
  queued: { label: "na fila da IA", cls: "run", icon: "⏳" },
  executing: { label: "IA implementando…", cls: "run", icon: "🔨" },
  built: { label: "pronto pra deploy", cls: "built", icon: "✅" },
  deploying: { label: "deployando…", cls: "run", icon: "🚀" },
  done: { label: "done · deployado", cls: "done", icon: "🚀" },
  failed: { label: "falhou", cls: "fail", icon: "⚠" },
};

export default function ExecSection({ items }: { items: ExecItem[] }) {
  if (!items.length) return null;
  return (
    <section className="ex-sec">
      <h2 className="ap-h2"><span className="ap-h2-glow" />EXECUÇÃO · a IA construindo o que você aprovou</h2>
      <div className="ex-list">
        {items.map((it) => {
          const s = STATE[it.exec_status] ?? STATE.queued;
          const running = ["queued", "executing", "deploying"].includes(it.exec_status);
          return (
            <div className={`ex-card ${s.cls}`} key={it.id}>
              <div className="ex-top">
                <span className="ex-agent">{it.agent}</span>
                <span className={`ex-state ${s.cls}`}>{s.icon} {s.label}</span>
              </div>
              <div className="ex-title">{it.title.replace(/^💡\s*/, "")}</div>
              {running && <div className="ex-bar" aria-hidden><span /></div>}
              {it.exec_status === "failed" && it.exec_log && <div className="ex-log">{it.exec_log.slice(0, 200)}</div>}
              <div className="ex-actions">
                {it.exec_pr && <a className="ex-link" href={it.exec_pr} target="_blank" rel="noreferrer">ver PR ↗</a>}
                {it.exec_status === "built" && (
                  <form>
                    <input type="hidden" name="id" value={it.id} />
                    <button className="ex-btn" formAction={deployApproval}>🚀 Push / Deploy</button>
                  </form>
                )}
                {it.exec_status === "done" && <span className="ex-doneflag">✓ no ar</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
