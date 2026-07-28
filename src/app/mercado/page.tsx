import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { loadSacadas } from "@/lib/fleet-data";
import { chartMarkup } from "@/lib/sacada-html";
import CopyButton from "@/components/copy-button";
import DownloadButton from "@/components/download-button";

export const dynamic = "force-dynamic";

const CONF: Record<string, { cls: string; label: string }> = {
  alta: { cls: "c-hi", label: "confiança alta" },
  media: { cls: "c-mid", label: "confiança média" },
  baixa: { cls: "c-lo", label: "⚠ revisar antes de publicar" },
};

function quando(d: string): string {
  try {
    return new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
  } catch { return d; }
}

export default async function MercadoPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const sacadas = await loadSacadas(90);

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
        <p className="mk-lead">Munição de conteúdo pro blog e a newsletter — o agente minera a base de licitações (PNCP nacional) + busca na web e destila um achado não óbvio por dia. Toda sacada tem número real, método e fonte. <b>{sacadas.length}</b> no acervo.</p>

        {sacadas.length === 0 && (
          <div className="chg-empty">Nenhuma sacada ainda. O agente roda de manhã e a primeira aparece aqui.</div>
        )}

        <div className="mk-list">
          {sacadas.map((s) => {
            const conf = CONF[s.confianca] ?? CONF.media;
            const copiaTxt = `${s.manchete}\n\n${s.numero_ancora}\n\n${s.sacada}\n\nPor que importa: ${s.e_dai}\n\nÂngulo: ${s.angulo}\n\nFonte: ${s.fonte}`;
            return (
              <article className="mk-card" key={s.id}>
                <div className="mk-card-head">
                  <span className="mk-date">{quando(s.dia)}</span>
                  <span className={`mk-conf ${conf.cls}`}>{conf.label}</span>
                </div>
                <div className="mk-numero">{s.numero_ancora}</div>
                <h3 className="mk-manchete">{s.manchete}</h3>
                <p className="mk-sacada">{s.sacada}</p>
                {s.grafico_data?.series?.length ? (
                  <div className="mk-chart" dangerouslySetInnerHTML={{ __html: chartMarkup(s.grafico_data) }} />
                ) : null}
                {s.e_dai && (
                  <div className="mk-block"><span className="mk-lbl">por que importa</span><p>{s.e_dai}</p></div>
                )}
                {s.angulo && (
                  <div className="mk-block"><span className="mk-lbl">ângulo de conteúdo</span><p>{s.angulo}</p></div>
                )}
                <details className="mk-det">
                  <summary>método &amp; fonte</summary>
                  <div className="mk-det-body">
                    {s.metodo && <p><b>Método:</b> {s.metodo}</p>}
                    {s.grafico && <p><b>Gráfico sugerido:</b> {s.grafico}</p>}
                    {s.fonte && <p><b>Fonte / ressalva:</b> {s.fonte}</p>}
                  </div>
                </details>
                <div className="mk-actions">
                  <CopyButton text={copiaTxt} />
                  <DownloadButton sacada={{ dia: quando(s.dia), manchete: s.manchete, numero_ancora: s.numero_ancora, sacada: s.sacada, e_dai: s.e_dai, angulo: s.angulo, metodo: s.metodo, fonte: s.fonte, confianca: s.confianca, grafico_data: s.grafico_data }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="hub-foot">Inteligência de mercado · minerada ao vivo pelo Mac mini · Central de Agentes i10</div>
    </main>
  );
}
