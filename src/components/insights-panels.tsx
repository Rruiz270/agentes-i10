import type { Insights } from "@/lib/fleet-data";

const fmtMi = (mi: number) => (mi >= 1000 ? `R$ ${(mi / 1000).toFixed(1)} bi` : `R$ ${mi} mi`);
const fmtReais = (v: number) => {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${Math.round(v / 1e3)} mil`;
  return `R$ ${Math.round(v)}`;
};
const mesLabel = (m: string) => {
  const [, mm] = m.split("-");
  return ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(mm)] ?? m;
};

export default function InsightsPanels({ ins }: { ins: Insights }) {
  if (!ins) {
    return (
      <div className="iq">
        <div className="iq-empty">Inteligência de mercado sendo calculada… volta em breve (roda 1x/dia no mini).</div>
      </div>
    );
  }
  const maxTrend = Math.max(1, ...ins.trends.map((t) => t.n));

  return (
    <section className="iq">
      <h2 className="iq-h2"><span className="iq-glow" />INTELIGÊNCIA DE MERCADO · licitações de educação</h2>
      <div className="iq-grid">

        {/* Valor em jogo */}
        <div className="iq-card wide">
          <div className="iq-k">VALOR EM JOGO · abertas agora</div>
          <div className="iq-big">{fmtMi(ins.valor.total_milhoes)}</div>
          <div className="iq-sub">{ins.valor.licitacoes.toLocaleString("pt-BR")} licitações abertas · média {fmtMi(Math.round(ins.valor.media / 1e6))} por edital</div>
        </div>

        {/* Tendências */}
        <div className="iq-card">
          <div className="iq-k">TENDÊNCIA · licitações/mês</div>
          <div className="iq-chart">
            {ins.trends.map((t) => (
              <div className="iq-bar-wrap" key={t.mes}>
                <div className="iq-bar" style={{ height: `${Math.max(6, (t.n / maxTrend) * 100)}%` }} title={`${t.n}`} />
                <div className="iq-bar-l">{mesLabel(t.mes)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de compradores */}
        <div className="iq-card">
          <div className="iq-k">QUEM MAIS LICITA (abertas)</div>
          <div className="iq-list">
            {ins.ranking.map((r, i) => (
              <div className="iq-row" key={i}>
                <span className="iq-rank">{i + 1}</span>
                <span className="iq-name">{r.orgao} <em>{r.uf}</em></span>
                <span className="iq-val">{r.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Concorrência */}
        <div className="iq-card wide">
          <div className="iq-k">CONCORRÊNCIA · quem mais vence contratos de educação</div>
          <div className="iq-list">
            {ins.concorrencia.length === 0 ? (
              <div className="iq-empty2">sem dados de contratos ainda</div>
            ) : ins.concorrencia.map((c, i) => (
              <div className="iq-row" key={i}>
                <span className="iq-rank">{i + 1}</span>
                <span className="iq-name">{c.fornecedor}</span>
                <span className="iq-val">{fmtReais(c.total)} · {c.contratos} contratos</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
