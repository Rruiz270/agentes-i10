import type { Pulso } from "@/lib/fleet-data";
import { timeAgo } from "@/lib/fleet-data";

const DONO: Record<string, { cls: string; label: string }> = {
  CTO: { cls: "cyan", label: "CTO · código" },
  COO: { cls: "mint", label: "COO · operação" },
  CMO: { cls: "violet", label: "CMO · marketing" },
  CFO: { cls: "amber", label: "CFO · custo" },
  você: { cls: "danger", label: "VOCÊ · decisão" },
};

// SEÇÃO DIREÇÃO — o pulso do Chief-of-Staff (heartbeat). Não é tarefa: é o
// diagnóstico do que importa AGORA, as 1–3 frentes de maior alavancagem contra
// os OKRs, o que ele escala pra você (🔴) e a leitura de custo do CFO.
export default function DirecaoSection({ pulso }: { pulso: Pulso }) {
  if (!pulso.pulso_em && !pulso.resumo) return null;
  return (
    <section className="dir">
      <div className="dir-head">
        <span className="dir-tag">DIREÇÃO · Chief-of-Staff</span>
        {pulso.pulso_em && <span className="dir-when">pulso há {timeAgo(pulso.pulso_em)}</span>}
      </div>
      {pulso.resumo && <p className="dir-resumo">{pulso.resumo}</p>}

      {pulso.prioridades.length > 0 && (
        <div className="dir-prio">
          {pulso.prioridades.map((p, i) => {
            const d = DONO[p.dono] ?? { cls: "dim", label: p.dono };
            return (
              <div className="dir-card" key={i}>
                <div className="dir-card-top">
                  <span className="dir-n">{i + 1}</span>
                  <b>{p.titulo}</b>
                  <span className={`dir-dono ${d.cls}`}>{d.label}</span>
                </div>
                {p.porque && <span className="dir-porque">{p.porque}</span>}
                {p.acao && <span className="dir-acao">→ {p.acao}</span>}
              </div>
            );
          })}
        </div>
      )}

      {pulso.escalacoes.length > 0 && (
        <div className="dir-esc">
          <span className="dir-esc-tag">🔴 escalado pra você</span>
          {pulso.escalacoes.map((e, i) => (
            <div className="dir-esc-item" key={i}>
              <b>{e.titulo}</b>
              {e.porque && <span>{e.porque}</span>}
            </div>
          ))}
        </div>
      )}

      {pulso.cfo && <div className="dir-cfo"><span className="dir-cfo-tag">💰 CFO</span>{pulso.cfo}</div>}
    </section>
  );
}
