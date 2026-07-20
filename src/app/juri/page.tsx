import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { loadJuriReport, type JuriRow } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

function quando(ts: string | null): string {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }); }
  catch { return "—"; }
}

function JuriRowCard({ r, tone }: { r: JuriRow; tone: "veto" | "ress" }) {
  const p = r.juri_parecer;
  return (
    <div className={`jr-card ${tone}`}>
      <div className="jr-top">
        <span className="jr-agent">{r.agent} · {r.projeto === "licita360" ? "Licita360" : "CRM"}</span>
        {typeof r.juri_score === "number" && <span className="jr-nota">nota {r.juri_score}/10</span>}
        <span className="jr-when">{quando(r.juri_at)}</span>
      </div>
      <div className="jr-title">{r.title.replace(/^💡\s*/, "")}</div>
      {p?.sintese && <div className="jr-sint">🧑‍⚖️ <b>Sena:</b> {p.sintese}</div>}
      {p && (
        <div className="jr-lentes">
          {p.vera?.parecer && <span>⚖️ Vera <i>{p.vera.nota}</i> · {p.vera.parecer}</span>}
          {p.rui?.parecer && <span>🔍 Rui <i>{p.rui.nota}</i> · {p.rui.parecer}</span>}
          {p.vania?.parecer && <span>💎 Vânia <i>{p.vania.nota}</i> · {p.vania.parecer}</span>}
        </div>
      )}
    </div>
  );
}

export default async function JuriPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");
  const { placar, vetados, ressalvas } = await loadJuriReport();
  const total = placar.aprovado + placar.ressalva + placar.vetado;
  const taxa = total ? Math.round((placar.vetado / total) * 100) : 0;

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
        <h2 className="ap-h2"><span className="ap-h2-glow" />RELATÓRIO DO JÚRI · Vera · Rui · Vânia · Sena</h2>
        <p className="hist-lead">Como o painel de IA está filtrando as propostas antes de chegarem a você. <b>{taxa}%</b> vetado — se subir demais, o júri está rígido; se cair a zero, está frouxo.</p>

        <div className="snap-grid" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="num mint">{placar.aprovado}</div><div className="lab">aprovados</div><div className="sub">chegaram a você</div></div>
          <div className="stat"><div className="num amber">{placar.ressalva}</div><div className="lab">com ressalva</div><div className="sub">passaram sinalizados</div></div>
          <div className="stat"><div className="num" style={{ color: "var(--violet)" }}>{placar.vetado}</div><div className="lab">vetados</div><div className="sub">barrados antes de você</div></div>
          <div className="stat"><div className="num cyan">{total}</div><div className="lab">total julgado</div><div className="sub">no Max · R$0</div></div>
        </div>

        <h3 className="jr-h3">⛔ Vetados pelo júri <span>— o que o painel barrou (e por quê)</span></h3>
        <div className="jr-list">
          {vetados.length === 0 ? <div className="ap-empty">Nada vetado ainda.</div> :
            vetados.map((r) => <JuriRowCard key={r.id} r={r} tone="veto" />)}
        </div>

        <h3 className="jr-h3" style={{ marginTop: 28 }}>⚠️ Passaram com ressalva <span>— chegaram a você, mas com uma pulga atrás da orelha</span></h3>
        <div className="jr-list">
          {ressalvas.length === 0 ? <div className="ap-empty">Nenhuma ressalva ativa.</div> :
            ressalvas.map((r) => <JuriRowCard key={r.id} r={r} tone="ress" />)}
        </div>
      </section>
    </main>
  );
}
