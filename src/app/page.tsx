import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "./actions";
import CriticoBanner from "@/components/critico-banner";
import { loadAll, loadCriticos, summaryFor, timeAgo } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

export default async function Hub() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const { board, feed, approvals } = await loadAll();
  const criticos = await loadCriticos();
  const tiles = [summaryFor("crm", board, approvals), summaryFor("licita", board, approvals)];
  const lastAgo = feed[0] ? timeAgo(feed[0].ts) : "—";
  const totalPend = approvals.length;

  return (
    <main className="hub">
      <div className="cc-scan" aria-hidden />
      <div className="hub-topbar">
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/juri">júri</Link>
          <Link className="cc-navlink" href="/historico">histórico</Link>
          {isAdmin(me.role) && <Link className="cc-navlink" href="/usuarios">usuários</Link>}
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <header className="hub-head">
        <span className="cc-logo"><i>i</i><b>10</b></span>
        <div>
          <h1 className="hub-title">CENTRAL DE AGENTES</h1>
          <div className="hub-sub">Escolha um projeto para entrar no Centro de Comando · último sinal {lastAgo} · {totalPend} aguardando você</div>
        </div>
      </header>

      <CriticoBanner criticos={criticos} />

      <div className="hub-tiles">
        {tiles.map((s) => (
          <Link className={`hub-tile st-${s.status}`} href={s.href} key={s.key}>
            <div className="hub-tile-top">
              <span className="hub-code">{s.code}</span>
              <div className="hub-id">
                <b>{s.label}</b>
                <span>{s.sub}</span>
              </div>
              <span className={`hub-dot ${s.status}`} />
            </div>

            <div className="hub-status-row">
              <span className={`hub-statuslabel ${s.status}`}>{s.statusLabel}</span>
              <span className="hub-units">{s.units} unidades</span>
            </div>

            <div className="hub-pend">
              <span className="hub-pend-n">{s.pending}</span>
              <span className="hub-pend-l">aguardando<br />você</span>
            </div>

            <div className="hub-bullets">
              {s.bullets.map((b, i) => (
                <div className={`hub-bullet ${b.sev}`} key={i}><span className="hub-bl-dot" />{b.text}</div>
              ))}
            </div>

            <div className="hub-cta">Abrir centro de comando →</div>
          </Link>
        ))}
      </div>

      <div className="hub-foot">Frota multi-projeto · publicada ao vivo pelo Mac mini · Central de Agentes i10</div>
    </main>
  );
}
