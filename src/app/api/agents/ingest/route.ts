import { sql } from "@/lib/db";

// POST /agentes/api/agents/ingest
// O Mac mini (agent-hq) publica aqui cada execução. Auth por segredo compartilhado.
export const dynamic = "force-dynamic";

type Run = {
  ts?: string;
  host?: string;
  projeto?: string;
  tarefa?: string;
  status?: string;
  summary?: string;
  checks?: unknown;
};

function valid(r: Run) {
  return typeof r?.projeto === "string" && typeof r?.tarefa === "string" && typeof r?.status === "string";
}

export async function POST(request: Request) {
  const secret = process.env.AGENTS_INGEST_SECRET;
  if (!secret) return Response.json({ error: "ingest não configurado" }, { status: 503 });
  if (request.headers.get("x-agent-secret") !== secret) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }

  const runs: Run[] = Array.isArray((body as { runs?: Run[] })?.runs)
    ? (body as { runs: Run[] }).runs
    : [body as Run];

  const ok = runs.filter(valid);
  if (!ok.length) return Response.json({ error: "nenhuma run válida" }, { status: 400 });

  for (const r of ok) {
    await sql`
      INSERT INTO reserva.agent_runs (ts, host, projeto, tarefa, status, summary, checks)
      VALUES (
        ${r.ts ?? new Date().toISOString()}, ${r.host ?? null}, ${r.projeto!},
        ${r.tarefa!}, ${r.status!}, ${r.summary ?? null}, ${JSON.stringify(r.checks ?? [])}
      )
    `;
  }
  return Response.json({ inserted: ok.length });
}
