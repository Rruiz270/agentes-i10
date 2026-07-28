import { cookies } from "next/headers";
import { unlockCrons } from "../actions";
import { CRONS_COOKIE, CRONS_TOKEN } from "@/lib/crons-const";
import { loadCronStatus, timeAgo, type CronRow } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";

const SRC: Record<string, { icon: string; label: string }> = {
  mini: { icon: "🖥️", label: "mini" },
  vercel: { icon: "▲", label: "vercel" },
  github: { icon: "🐙", label: "github" },
};
const STATUS: Record<string, { cls: string; label: string }> = {
  ok: { cls: "ok", label: "✓ rodou ok" },
  fail: { cls: "fail", label: "⚠ falhou" },
  unknown: { cls: "unk", label: "— sem sinal" },
  agendado: { cls: "sch", label: "agendado" },
  pausado: { cls: "warn", label: "pausado" },
};

function Gate({ erro }: { erro: boolean }) {
  return (
    <main className="loginwrap">
      <form className="loginbox" action={unlockCrons}>
        <span className="logo"><i>i</i><b>10</b></span>
        <h1>Agenda de Jobs</h1>
        <p>Raio-x de tudo que é agendado na i10. Acesso por senha.</p>
        <input name="pw" type="password" placeholder="senha" autoFocus />
        {erro && <div className="err">senha incorreta</div>}
        <button type="submit">entrar</button>
      </form>
    </main>
  );
}

export default async function CronsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const jar = await cookies();
  const sp = await searchParams;
  if (jar.get(CRONS_COOKIE)?.value !== CRONS_TOKEN) return <Gate erro={sp?.e === "1"} />;

  const crons = await loadCronStatus();
  const byProj: Record<string, CronRow[]> = {};
  for (const c of crons) (byProj[c.projeto] ??= []).push(c);
  const projetos = Object.keys(byProj).sort();
  const nFail = crons.filter((c) => c.status === "fail").length;
  const nOk = crons.filter((c) => c.status === "ok").length;
  const atualizado = crons.length ? crons.reduce((a, c) => (c.updated_at > a ? c.updated_at : a), crons[0].updated_at) : null;

  return (
    <main className="ccwrap">
      <div className="cc-scan" aria-hidden />
      <header className="hub-head" style={{ marginBottom: 8 }}>
        <span className="cc-logo"><i>i</i><b>10</b></span>
        <div>
          <h1 className="hub-title">AGENDA DE JOBS</h1>
          <div className="hub-sub">Raio-x de todos os crons da i10 · mini · Vercel · GitHub — num lugar só{atualizado ? ` · atualizado há ${timeAgo(atualizado)}` : ""}</div>
        </div>
      </header>

      <div className="crn-kpis">
        <div className="crn-kpi"><b>{crons.length}</b><span>jobs agendados</span></div>
        <div className="crn-kpi ok"><b>{nOk}</b><span>rodaram ok</span></div>
        <div className={`crn-kpi ${nFail ? "fail" : ""}`}><b>{nFail}</b><span>falharam</span></div>
        <div className="crn-kpi"><b>{projetos.length}</b><span>projetos</span></div>
      </div>

      {crons.length === 0 && <div className="chg-empty">O monitor ainda não rodou. Ele varre mini + Vercel + GitHub a cada 30 min.</div>}

      {projetos.map((proj) => {
        const rows = byProj[proj];
        const f = rows.filter((r) => r.status === "fail").length;
        return (
          <section className="crn-proj" key={proj}>
            <div className="crn-proj-head">
              <h3>{proj}</h3>
              <span className="crn-proj-n">{rows.length} job(s){f > 0 && <b className="crn-badfail"> · {f} com falha</b>}</span>
            </div>
            <div className="crn-list">
              {rows.map((r, i) => {
                const src = SRC[r.source] ?? { icon: "•", label: r.source };
                const st = STATUS[r.status ?? "unknown"] ?? STATUS.unknown;
                return (
                  <div className={`crn-row ${st.cls}`} key={i}>
                    <span className="crn-src" title={src.label}>{src.icon}</span>
                    <span className="crn-name">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.name}</a> : r.name}</span>
                    <span className="crn-sched">{r.schedule}</span>
                    <span className="crn-last">{r.last_run ? `há ${timeAgo(r.last_run)}` : "—"}</span>
                    <span className={`crn-st ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="hub-foot">Agenda de Jobs · monitor mini + Vercel + GitHub · Central de Agentes i10</div>
    </main>
  );
}
