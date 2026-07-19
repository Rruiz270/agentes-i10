"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { verifyCredentials, currentUser, canSeeAgentes } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const user = await verifyCredentials(email, password);
  if (!user) return { error: "E-mail ou senha inválidos." };
  if (!canSeeAgentes(user.role)) return { error: "Sua conta não tem acesso ao painel de Agentes." };

  await createSession({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

async function requireTotal() {
  const me = await currentUser();
  if (!me || !canSeeAgentes(me.role)) throw new Error("Acesso negado.");
  return me;
}

export async function approveApproval(formData: FormData) {
  const me = await requireTotal();
  const id = Number(formData.get("id"));
  const message = String(formData.get("message") || "");
  if (!id) return;

  // Dados de envio (se a ação for um disparo real via template aprovado).
  const rows = (await sql`
    SELECT send_to, send_conv_id, send_template, send_vars
    FROM reserva.agent_approvals WHERE id = ${id} AND status = 'pending'
  `) as Array<{ send_to: string | null; send_conv_id: number | null; send_template: string | null; send_vars: Record<string, string> | null }>;
  const a = rows[0];

  let sendStatus: string | null = null;
  let sendResult: string | null = null;
  if (a?.send_template) {
    const url = process.env.CRM_SEND_URL, secret = process.env.AGENT_SEND_SECRET;
    if (!url || !secret) {
      sendStatus = "sem_config";
    } else {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-agent-secret": secret },
          body: JSON.stringify({
            conversationId: a.send_conv_id, to: a.send_to,
            contentSid: a.send_template, variables: a.send_vars ?? {}, agent: "leads",
          }),
        });
        const j = await res.json().catch(() => ({}));
        sendStatus = j.sent ? "enviado" : j.skipped ? `pulado:${j.skipped}` : "falhou";
        sendResult = JSON.stringify(j).slice(0, 300);
      } catch (e) {
        sendStatus = "falhou"; sendResult = String(e).slice(0, 200);
      }
    }
  }

  await sql`
    UPDATE reserva.agent_approvals
    SET status = 'approved', message = ${message}, decided_at = now(), decided_by = ${me.email},
        send_status = ${sendStatus}, send_result = ${sendResult}
    WHERE id = ${id} AND status = 'pending'
  `;
  revalidatePath("/");
}

export async function rejectApproval(formData: FormData) {
  const me = await requireTotal();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`
    UPDATE reserva.agent_approvals
    SET status = 'rejected', decided_at = now(), decided_by = ${me.email}
    WHERE id = ${id} AND status = 'pending'
  `;
  revalidatePath("/");
}
