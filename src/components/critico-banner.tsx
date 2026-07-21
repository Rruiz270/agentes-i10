import { resolverCritico } from "@/app/actions";
import type { Critico } from "@/lib/fleet-data";

// Faixa vermelha no topo — só aparece quando há um CRÍTICO DE PRODUÇÃO ativo
// (algo que afeta o cliente). Fura o júri; some sozinho quando o monitor detecta
// que normalizou, ou quando você marca resolvido.
export default function CriticoBanner({ criticos }: { criticos: Critico[] }) {
  if (!criticos.length) return null;
  return (
    <div className="crit-wrap" role="alert">
      {criticos.map((c) => (
        <div className="crit" key={c.id}>
          <span className="crit-badge"><span className="crit-dot" />PRODUÇÃO AFETADA</span>
          <div className="crit-body">
            <b>{c.title}</b>
            {c.reason && <span>{c.reason}</span>}
            <span className="crit-proj">{c.projeto === "licita360" ? "Licita360" : "CRM"} · detectado pelo Crítico de Produção</span>
          </div>
          <form>
            <input type="hidden" name="id" value={c.id} />
            <button className="crit-btn" formAction={resolverCritico}>marcar resolvido</button>
          </form>
        </div>
      ))}
    </div>
  );
}
