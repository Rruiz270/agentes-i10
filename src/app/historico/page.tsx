import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { loadHistorico } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

function quando(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    });
  } catch { return "—"; }
}
function desfecho(h: { exec_status: string | null; send_status: string | null }): { txt: string; cls: string } {
  if (h.exec_status === "done") return { txt: "🚀 no ar", cls: "ok" };
  if (h.exec_status === "built") return { txt: "✅ pronto p/ deploy", cls: "mid" };
  if (h.exec_status === "failed") return { txt: "⚠ falhou", cls: "bad" };
  if (h.exec_status) return { txt: "🔨 em execução", cls: "mid" };
  if (h.send_status === "enviado") return { txt: "📲 enviado", cls: "ok" };
  if (h.send_status?.startsWith("pulado")) return { txt: "⏭ pulado", cls: "mid" };
  if (h.send_status === "falhou") return { txt: "⚠ envio falhou", cls: "bad" };
  return { txt: "—", cls: "dim" };
}

export default async function HistoricoPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");
  const hist = await loadHistorico(200);
  const aprov = hist.filter((h) => h.status === "approved").length;
  const rej = hist.filter((h) => h.status === "rejected").length;

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/juri">júri</Link>
          <Link className="cc-navlink" href="/historico">histórico</Link>
          {isAdmin(me.role) && <Link className="cc-navlink" href="/usuarios">usuários</Link>}
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <section className="hist">
        <h2 className="ap-h2"><span className="ap-h2-glow" />HISTÓRICO · toda decisão registrada</h2>
        <p className="hist-lead">Rastro completo de auditoria — o que foi decidido, por quem, quando e o desfecho. <b>{aprov}</b> aprovadas · <b>{rej}</b> recusadas · {hist.length} no total.</p>
        <div className="hist-wrap">
          <table className="hist-table">
            <thead><tr><th>Quando</th><th>Projeto</th><th>Agente</th><th>Item</th><th>Decisão</th><th>Por quem</th><th>Desfecho</th></tr></thead>
            <tbody>
              {hist.map((h) => {
                const d = desfecho(h);
                return (
                  <tr key={h.id}>
                    <td className="hist-when">{quando(h.decided_at)}</td>
                    <td>{h.projeto === "licita360" ? "Licita360" : "CRM"}</td>
                    <td className="hist-agent">{h.agent}</td>
                    <td className="hist-item">
                      {h.title.replace(/^💡\s*/, "")}
                      {h.exec_pr && <a className="hist-pr" href={h.exec_pr} target="_blank" rel="noreferrer">PR ↗</a>}
                    </td>
                    <td><span className={`hist-dec ${h.status}`}>
                      {h.status === "approved" ? "✅ aprovado" : h.status === "vetado" ? "⚖️ vetado pelo júri" : "✕ recusado"}
                      {h.status === "vetado" && typeof h.juri_score === "number" ? ` · ${h.juri_score}/10` : ""}
                    </span></td>
                    <td className="hist-by">{h.decided_by ? h.decided_by.split("@")[0] : (h.status === "vetado" ? (h.juri_by ?? "júri") : "—")}</td>
                    <td><span className={`hist-out ${d.cls}`}>{d.txt}</span></td>
                  </tr>
                );
              })}
              {hist.length === 0 && <tr><td colSpan={7} className="hist-empty">Nenhuma decisão registrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
