import { sql } from "@/lib/db";

// POST /agentes/api/cron/heartbeat
// Qualquer cron da Vercel (de QUALQUER projeto i10) carimba aqui "eu rodei".
//
// POR QUE ESTE ENDPOINT EXISTE
// A API da Vercel entrega só a AGENDA dos crons, nunca o histórico de execução.
// Então quem sabe que rodou é o próprio endpoint. Antes disso só o i10-audit-crm
// carimbava, e o monitor tinha essa regra cravada no código:
//     const batida = p.name === "i10-audit-crm" ? batidas[chave] : null
// ou seja, os outros 13 crons apareciam "sem telemetria" para sempre, e nem
// adiantava instrumentá-los. Aqui a batida é genérica: (projeto, path).
//
// Chave é (projeto, path) e não só path de propósito: há crons diferentes que
// batem no MESMO path (Processos BE chama /api/cron/atualizar às 10h e às 22h).
// Os dois compartilham a batida — que é o certo, é o mesmo endpoint; se um dos
// horários não disparar, o carimbo fica velho e o monitor acusa "atrasado".
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.AGENTS_INGEST_SECRET;
  if (!secret) return Response.json({ error: "heartbeat não configurado" }, { status: 503 });
  if (request.headers.get("x-agent-secret") !== secret) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: { projeto?: string; path?: string; detail?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }

  const { projeto, path, detail } = body;
  if (!projeto || !path) {
    return Response.json({ error: "projeto e path são obrigatórios" }, { status: 400 });
  }

  await sql`
    INSERT INTO reserva.cron_heartbeats (projeto, path, last_run_at, detail)
    VALUES (${projeto}, ${path}, now(), ${detail ?? null})
    ON CONFLICT (projeto, path)
    DO UPDATE SET last_run_at = now(), detail = ${detail ?? null}
  `;
  return Response.json({ ok: true, projeto, path });
}
