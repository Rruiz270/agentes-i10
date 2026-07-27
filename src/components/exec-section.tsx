import { deployApproval, retryApproval, flushBatch } from "@/app/actions";
import type { ExecItem } from "@/lib/fleet-data";

const STATE: Record<string, { label: string; cls: string; icon: string }> = {
  queued: { label: "na fila da IA", cls: "run", icon: "⏳" },
  executing: { label: "IA implementando…", cls: "run", icon: "🔨" },
  built: { label: "pronto pra revisar", cls: "built", icon: "✅" },
  deploy_queued: { label: "no lote — aguardando", cls: "built", icon: "📦" },
  deploy_now: { label: "lançando…", cls: "run", icon: "🚀" },
  deploying: { label: "deployando…", cls: "run", icon: "🚀" },
  done: { label: "done · deployado", cls: "done", icon: "🚀" },
  failed: { label: "falhou", cls: "fail", icon: "⚠" },
};

const RISCO: Record<string, { cls: string; label: string }> = {
  baixo: { cls: "r-lo", label: "🟢 risco baixo" },
  medio: { cls: "r-mid", label: "🟡 risco médio" },
  alto: { cls: "r-hi", label: "🔴 risco alto" },
};

export default function ExecSection({ items }: { items: ExecItem[] }) {
  if (!items.length) return null;
  const emLote = items.filter((i) => i.exec_status === "deploy_queued");
  return (
    <section className="ex-sec">
      <h2 className="ap-h2"><span className="ap-h2-glow" />EXECUÇÃO · a IA construindo o que você aprovou</h2>
      {emLote.length > 0 && (
        <div className="ex-lote">
          <span className="ex-lote-n">📦 {emLote.length} no lote</span>
          <span className="ex-lote-txt">lançam juntos quando você parar de aprovar (~3 min) — 1 deploy só</span>
          <form>
            <button className="ex-lote-btn" formAction={flushBatch}>Lançar lote agora →</button>
          </form>
        </div>
      )}
      <div className="ex-list">
        {items.map((it) => {
          const s = STATE[it.exec_status] ?? STATE.queued;
          const running = ["queued", "executing", "deploying", "deploy_now"].includes(it.exec_status);
          const rev = it.exec_review;
          const risco = rev ? (RISCO[rev.risco] ?? RISCO.medio) : null;
          return (
            <div className={`ex-card ${s.cls}`} key={it.id}>
              <div className="ex-top">
                <span className="ex-agent">{it.agent}</span>
                {it.decided_by && <span className="ex-by">✅ {it.decided_by.split("@")[0]}</span>}
                <span className={`ex-state ${s.cls}`}>{s.icon} {s.label}</span>
              </div>
              <div className="ex-title">{it.title.replace(/^💡\s*/, "")}</div>
              {running && <div className="ex-bar" aria-hidden><span /></div>}
              {it.exec_status === "failed" && it.exec_log && <div className="ex-log">{it.exec_log.slice(0, 200)}</div>}
              {it.exec_status === "failed" && (
                <form className="ex-retry-form">
                  <input type="hidden" name="id" value={it.id} />
                  <button className="ex-retry" formAction={retryApproval}>↻ Tentar de novo</button>
                  <span className="ex-retry-hint">re-executa a IA e gera um novo PR</span>
                </form>
              )}

              {it.exec_status === "built" && rev && (
                <details className="ex-rev">
                  <summary>
                    🔍 Revisar
                    {risco && <span className={`ex-risco ${risco.cls}`}>{risco.label}</span>}
                  </summary>
                  <div className="ex-rev-body">
                    {rev.resumo && (
                      <div className="ex-rev-block">
                        <span className="ex-rev-lbl">o que muda</span>
                        <p>{rev.resumo}</p>
                      </div>
                    )}
                    {rev.testar && (
                      <div className="ex-rev-block">
                        <span className="ex-rev-lbl">o que testar</span>
                        <p>{rev.testar}</p>
                      </div>
                    )}
                    {rev.arquivos?.length > 0 && (
                      <div className="ex-rev-block">
                        <span className="ex-rev-lbl">arquivos ({rev.arquivos.length})</span>
                        <ul className="ex-files">
                          {rev.arquivos.map((f) => <li key={f}><code>{f}</code></li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="ex-actions">
                {it.exec_status === "built" && it.exec_preview && (
                  <a className="ex-preview" href={it.exec_preview} target="_blank" rel="noreferrer">👁 Ver preview</a>
                )}
                {it.exec_pr && <a className="ex-link" href={it.exec_pr} target="_blank" rel="noreferrer">ver código ↗</a>}
                {it.exec_status === "built" && (
                  <form className="ex-depform">
                    <input type="hidden" name="id" value={it.id} />
                    <button className="ex-btn" name="mode" value="now" formAction={deployApproval}>🚀 Deploy agora</button>
                    <button className="ex-btn-alt" name="mode" value="batch" formAction={deployApproval}>📦 Somar ao lote</button>
                  </form>
                )}
                {it.exec_status === "deploy_queued" && <span className="ex-lotetag">📦 no lote</span>}
                {it.exec_status === "done" && <span className="ex-doneflag">✓ no ar</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
