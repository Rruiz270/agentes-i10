import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { loadChangelog, PROJ_LABEL, type ChangeItem } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

const RISCO: Record<string, { cls: string; label: string }> = {
  baixo: { cls: "r-lo", label: "🟢 baixo" },
  medio: { cls: "r-mid", label: "🟡 médio" },
  alto: { cls: "r-hi", label: "🔴 alto" },
};

function quando(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
  } catch { return "—"; }
}

export default async function MudancasPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const changes = await loadChangelog(300);
  const byProj: Record<string, ChangeItem[]> = {};
  for (const c of changes) (byProj[c.projeto] ??= []).push(c);
  const projetos = Object.keys(byProj);
  const desde30 = Date.now() - 30 * 864e5;
  const ultimos30 = changes.filter((c) => c.shipped_at && new Date(c.shipped_at).getTime() > desde30).length;

  return (
    <main className="ccwrap">
      <div className="cc-scan" aria-hidden />
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/mudancas">evolução</Link>
          <Link className="cc-navlink" href="/juri">júri</Link>
          <Link className="cc-navlink" href="/historico">histórico</Link>
          {isAdmin(me.role) && <Link className="cc-navlink" href="/usuarios">usuários</Link>}
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <section className="chg">
        <h2 className="ap-h2"><span className="ap-h2-glow" />EVOLUÇÃO DOS SISTEMAS · o que os agentes entregaram</h2>
        <p className="chg-lead">O rastro vivo das melhorias que foram ao ar — só mudanças de sistema, não cobrança interna. <b>{changes.length}</b> no ar · <b>{ultimos30}</b> nos últimos 30 dias.</p>

        {changes.length === 0 && (
          <div className="chg-empty">Nenhuma melhoria entregue ainda. Quando você aprovar e fizer deploy de uma sugestão, ela aparece aqui.</div>
        )}

        {projetos.map((proj) => (
          <div className="chg-proj" key={proj}>
            <div className="chg-proj-head">
              <span className={`chg-proj-dot ${proj}`} />
              <h3>{PROJ_LABEL[proj] ?? proj}</h3>
              <span className="chg-proj-n">{byProj[proj].length} melhoria(s)</span>
            </div>
            <div className="chg-timeline">
              {byProj[proj].map((c) => {
                const risco = c.risco ? (RISCO[c.risco] ?? RISCO.medio) : null;
                return (
                  <div className="chg-item" key={c.id}>
                    <div className="chg-item-top">
                      <span className="chg-date">{quando(c.shipped_at)}</span>
                      <b className="chg-title">{c.title}</b>
                      {risco && <span className={`chg-risco ${risco.cls}`}>{risco.label}</span>}
                    </div>
                    {c.resumo && <p className="chg-resumo">{c.resumo}</p>}
                    <div className="chg-meta">
                      <span className="chg-agent">💡 {c.agent}</span>
                      {c.decided_by && <span className="chg-by">✅ {c.decided_by.split("@")[0]}</span>}
                      {c.arquivos.length > 0 && <span className="chg-files">{c.arquivos.length} arquivo(s)</span>}
                      {c.exec_pr && <a className="chg-pr" href={c.exec_pr} target="_blank" rel="noreferrer">ver código ↗</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className="hub-foot">Evolução dos sistemas · publicada ao vivo pelo Mac mini · Central de Agentes i10</div>
    </main>
  );
}
