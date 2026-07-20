import { sql } from "@/lib/db";

// GET /agentes/api/agents/status
// Retorna, por (projeto, agente), quantas aprovações teve e se já GRADUOU
// (aprov >= meta). O mini usa isso pra decidir se age sozinho (auto-ação).
export const dynamic = "force-dynamic";

const META_EXTERNO = new Set(["Leads sem resposta"]);
const metaDe = (agent: string) => (META_EXTERNO.has(agent) ? 20 : 10);

export async function GET() {
  const rows = (await sql`
    SELECT projeto, agent,
      count(*) FILTER (WHERE status = 'approved')::int aprov,
      count(*) FILTER (WHERE status = 'rejected')::int rej
    FROM reserva.agent_approvals GROUP BY projeto, agent
  `) as { projeto: string; agent: string; aprov: number; rej: number }[];

  const agents: Record<string, { aprov: number; rej: number; meta: number; autonomo: boolean }> = {};
  for (const r of rows) {
    const meta = metaDe(r.agent);
    agents[`${r.projeto}|${r.agent}`] = { aprov: r.aprov, rej: r.rej, meta, autonomo: r.aprov >= meta };
  }
  return Response.json({ agents });
}
