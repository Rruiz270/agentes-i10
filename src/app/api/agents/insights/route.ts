import { sql } from "@/lib/db";

// POST /agentes/api/agents/insights
// O mini publica o snapshot de inteligência de um projeto (tendências, valor,
// rankings, concorrência). Upsert por projeto. Auth por secret.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.AGENTS_INGEST_SECRET;
  if (!secret) return Response.json({ error: "ingest não configurado" }, { status: 503 });
  if (request.headers.get("x-agent-secret") !== secret)
    return Response.json({ error: "não autorizado" }, { status: 401 });

  let body: { projeto?: string; data?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "json inválido" }, { status: 400 }); }
  if (!body?.projeto || !body?.data) return Response.json({ error: "faltam projeto e data" }, { status: 400 });

  await sql`
    INSERT INTO reserva.project_insights (projeto, data, updated_at)
    VALUES (${body.projeto}, ${JSON.stringify(body.data)}, now())
    ON CONFLICT (projeto) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
  return Response.json({ ok: true });
}
