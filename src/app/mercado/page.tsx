import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { loadSacadas, type Sacada } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
function shift(sel: string, delta: number) {
  const [y, m] = sel.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return ym(d.getUTCFullYear(), d.getUTCMonth() + 1);
}
const topico = (s: string) => { const t = s.replace(/^💡\s*/, ""); return t.length > 52 ? t.slice(0, 50) + "…" : t; };

export default async function MercadoPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const sacadas = await loadSacadas(200);
  const byDia = new Map<string, Sacada>(sacadas.map((s) => [s.dia, s]));
  const meses = [...new Set(sacadas.map((s) => s.dia.slice(0, 7)))].sort().reverse();
  const hoje = new Date();
  const sp = await searchParams;
  const sel = sp?.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : (meses[0] ?? ym(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1));

  const [Y, M] = sel.split("-").map(Number);
  const firstDow = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
  const nDays = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const titulo = new Date(Date.UTC(Y, M - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const noMes = sacadas.filter((s) => s.dia.startsWith(sel)).length;

  return (
    <main className="ccwrap">
      <div className="cc-scan" aria-hidden />
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/mercado">mercado</Link>
          <Link className="cc-navlink" href="/mudancas">evolução</Link>
          <Link className="cc-navlink" href="/juri">júri</Link>
          <Link className="cc-navlink" href="/historico">histórico</Link>
          {isAdmin(me.role) && <Link className="cc-navlink" href="/usuarios">usuários</Link>}
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <section className="mk">
        <h2 className="ap-h2"><span className="ap-h2-glow" />INTELIGÊNCIA DE MERCADO · uma sacada por dia</h2>
        <p className="mk-lead">Munição de conteúdo pro blog e a newsletter — o agente minera a base de licitações (PNCP nacional) + web e destila um achado por dia. <b>Clique num dia</b> para abrir a sacada no formato de relatório i10. <b>{sacadas.length}</b> no acervo.</p>

        <div className="mkc-head">
          <Link className="mkc-nav" href={`/mercado?m=${shift(sel, -1)}`}>← mês anterior</Link>
          <div className="mkc-title">{titulo}<span className="mkc-count">{noMes} sacada(s)</span></div>
          <Link className="mkc-nav" href={`/mercado?m=${shift(sel, 1)}`}>próximo mês →</Link>
        </div>

        <div className="mkc-grid">
          {WD.map((w) => <div className="mkc-wd" key={w}>{w}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div className="mkc-cell empty" key={i} />;
            const dia = `${sel}-${String(d).padStart(2, "0")}`;
            const s = byDia.get(dia);
            return (
              <div className={`mkc-cell${s ? " has" : ""}`} key={i}>
                <span className="mkc-daynum">{d}</span>
                {s && (
                  <a className="mkc-topic" href={`/agentes/mercado/${dia}`} target="_blank" rel="noreferrer" title={s.manchete}>
                    <span className={`mkc-dot ${s.confianca === "baixa" ? "lo" : "hi"}`} />{topico(s.manchete)}
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <p className="mkc-legend"><span className="mkc-dot hi" /> pronta &nbsp;·&nbsp; <span className="mkc-dot lo" /> revisar antes de publicar &nbsp;·&nbsp; clicar abre o relatório i10 em nova aba</p>
      </section>

      <div className="hub-foot">Inteligência de mercado · minerada ao vivo pelo Mac mini · Central de Agentes i10</div>
    </main>
  );
}
