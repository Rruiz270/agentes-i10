import { sql } from "@/lib/db";

// GET /agentes/api/cron/frota-alerta  — cron da Vercel, a cada 15 min.
//
// POR QUE ISSO RODA NA VERCEL E NÃO NO MINI
// Em 11/ago/2026 o /usr/sbin/cron do mini morreu e a frota inteira ficou 13
// dias parada EM SILÊNCIO. O painel detectou (o dead-man switch pintou "FROTA
// OFFLINE"), mas detecção que ninguém abre não é alerta. Todo vigia daquela
// época era ele próprio um cron DO MINI — quando o mini cai, o vigia cai junto.
// Este vive fora do mini de propósito: é o único que sobrevive ao mini sumir.
//
// Só notifica em TRANSIÇÃO (no ar↔mudo), com reprise a cada REPRISE_H se seguir
// mudo — senão vira ruído diário e você aprende a ignorar, que foi o problema.
export const dynamic = "force-dynamic";

const LIMITE_MIN = 30; // ping de vida é a cada 5 min; 30 min = 6 perdidos seguidos
const REPRISE_H = 12;
const PARA = process.env.SAUDE_EMAIL || "raphael.ruiz@betteredu.com.br";

type Estado = { offline: boolean; desde: string | null; ultimo_envio: string | null };

// Carimba a própria execução. Direto no banco porque estamos DENTRO do agentes-i10;
// os outros projetos batem via POST /agentes/api/cron/heartbeat.
async function baterPonto(detail: string) {
  try {
    await sql`
      INSERT INTO reserva.cron_heartbeats (projeto, path, last_run_at, detail)
      VALUES ('agentes-i10', '/agentes/api/cron/frota-alerta', now(), ${detail})
      ON CONFLICT (projeto, path) DO UPDATE SET last_run_at = now(), detail = ${detail}
    `;
  } catch {
    // Telemetria nunca pode derrubar o alerta — se o carimbo falhar, siga.
  }
}

async function enviar(assunto: string, corpo: string) {
  if (!process.env.BREVO_API_KEY) return "sem BREVO_API_KEY";
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Frota i10 — vigia", email: process.env.ALERTAS_FROM || "i10@i10.org.br" },
      to: [{ email: PARA }],
      subject: assunto,
      htmlContent: `<pre style="font:14px/1.5 -apple-system,sans-serif;white-space:pre-wrap">${corpo}</pre>`,
    }),
  });
  return `brevo ${r.status}`;
}

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const [{ ult }] = (await sql`
    SELECT max(ts) AS ult FROM reserva.agent_runs WHERE tarefa = 'liveness'
  `) as { ult: string | null }[];

  const agora = Date.now();
  // ?simular=offline força o caminho de alerta e NÃO grava estado — serve pra
  // testar o e-mail de verdade sem ter que derrubar a frota. Protegido pelo
  // mesmo CRON_SECRET; sem segredo configurado, só responde em dev.
  const simular = new URL(req.url).searchParams.get("simular") === "offline";
  const mudoMin = simular ? 999 : ult ? Math.floor((agora - new Date(ult).getTime()) / 60000) : Infinity;
  const offline = simular || mudoMin > LIMITE_MIN;

  const [estado] = (await sql`
    SELECT offline, desde, ultimo_envio FROM reserva.frota_alerta_estado WHERE id = 1
  `) as Estado[];

  const mudou = offline !== estado.offline;
  const horasDesdeEnvio = estado.ultimo_envio
    ? (agora - new Date(estado.ultimo_envio).getTime()) / 3600000
    : Infinity;
  // Reprise só faz sentido enquanto SEGUE mudo — quando volta, o e-mail de
  // normalização já é a transição e não precisa insistir.
  const reprisar = offline && !mudou && horasDesdeEnvio >= REPRISE_H;

  if (!simular && !mudou && !reprisar) {
    await baterPonto(`frota no ar · ping há ${mudoMin} min`);
    return Response.json({ offline, mudo_min: mudoMin, acao: "sem mudança" });
  }

  const desde = offline ? (mudou ? new Date(agora).toISOString() : estado.desde) : null;
  const assunto = offline
    ? `${simular ? "[TESTE] " : ""}⚠ Frota i10 MUDA há ${mudoMin} min${reprisar ? " (segue parada)" : ""}`
    : "✅ Frota i10 voltou ao ar";
  const corpo = offline
    ? [
        `O ping de vida do mini (a cada 5 min) não chega há ${mudoMin} min.`,
        `Último sinal: ${ult ?? "nunca"}`,
        "",
        "Provável causa (já aconteceu em 11/ago/2026): o /usr/sbin/cron do mini morreu.",
        "O launchd NÃO religa sozinho — com.vix.cron só tem KeepAlive se /etc/crontab",
        "existir, e nesse Mac ele não existe.",
        "",
        "Conferir:",
        "  ssh raphaelruiz@100.67.81.108 'pgrep -x cron || echo CRON MORTO'",
        "  ssh raphaelruiz@100.67.81.108 'tail ~/agent-hq/logs/cron-watchdog.log'",
        "",
        "O watchdog (LaunchAgent com.i10.cron-watchdog) deveria religar em até 2 min.",
        "Se este e-mail chegou, ou o watchdog caiu junto, ou o mini está fora do ar.",
        "",
        "Painel: https://www.institutoi10.com.br/agentes/crons",
      ].join("\n")
    : `O ping de vida voltou. Último sinal: ${ult}. Frota operando normalmente.`;

  const envio = await enviar(assunto, corpo);

  if (!simular) {
    await sql`
      UPDATE reserva.frota_alerta_estado
      SET offline = ${offline}, desde = ${desde}, ultimo_envio = now()
      WHERE id = 1
    `;
  }

  await baterPonto(offline ? `ALERTA enviado · mudo há ${mudoMin} min` : "frota normalizada");

  return Response.json({
    offline,
    mudo_min: mudoMin,
    acao: simular ? "simulação (estado não gravado)" : reprisar ? "reprise" : "transição",
    envio,
  });
}
