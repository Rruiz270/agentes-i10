import { sql } from "@/lib/db";

// POST /agentes/api/agents/approvals
// Os agentes operacionais (no mini) publicam aqui as ações preparadas.
// Dedup por ext_key (índice único parcial em status='pending'): não recria
// uma aprovação que já está pendente.
export const dynamic = "force-dynamic";

type Item = {
  agent?: string; kind?: string; channel?: string; title?: string;
  target?: string; reason?: string; message?: string; ext_key?: string;
};
const valid = (i: Item) =>
  typeof i?.agent === "string" && typeof i?.title === "string" &&
  (i?.kind === "interno" || i?.kind === "externo");

export async function POST(request: Request) {
  const secret = process.env.AGENTS_INGEST_SECRET;
  if (!secret) return Response.json({ error: "ingest não configurado" }, { status: 503 });
  if (request.headers.get("x-agent-secret") !== secret)
    return Response.json({ error: "não autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "json inválido" }, { status: 400 }); }
  const items: Item[] = Array.isArray((body as { approvals?: Item[] })?.approvals)
    ? (body as { approvals: Item[] }).approvals : [body as Item];
  const ok = items.filter(valid);
  if (!ok.length) return Response.json({ error: "nenhuma aprovação válida" }, { status: 400 });

  let inserted = 0;
  for (const i of ok) {
    const r = await sql`
      INSERT INTO reserva.agent_approvals (agent, kind, channel, title, target, reason, message, ext_key)
      VALUES (${i.agent!}, ${i.kind!}, ${i.channel ?? null}, ${i.title!},
              ${i.target ?? null}, ${i.reason ?? null}, ${i.message ?? null}, ${i.ext_key ?? null})
      ON CONFLICT (ext_key) WHERE status = 'pending' DO NOTHING
      RETURNING id
    `;
    inserted += (r as unknown[]).length;
  }
  return Response.json({ received: ok.length, inserted });
}
