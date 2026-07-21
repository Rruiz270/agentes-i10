"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import {
  verifyCredentials, currentUser, canSeeAgentes, canApprove, canDeployExternal,
  canManageUsers, upsertAgentesUser, setAgentesRole, AGENTES_ROLES,
} from "@/lib/auth";
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
  if (!canSeeAgentes(user.agentes_role)) return { error: "Sua conta não tem acesso ao painel de Agentes." };

  await createSession({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.agentes_role ?? "",
  });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

async function requireSee() {
  const me = await currentUser();
  if (!me || !canSeeAgentes(me.role)) throw new Error("Acesso negado.");
  return me;
}
async function requireApprove() {
  const me = await currentUser();
  if (!me || !canApprove(me.role)) throw new Error("Você não tem permissão para aprovar.");
  return me;
}
async function requireAdmin() {
  const me = await currentUser();
  if (!me || !canManageUsers(me.role)) throw new Error("Ação restrita a Admin.");
  return me;
}

export async function approveApproval(formData: FormData) {
  const me = await requireApprove();
  const id = Number(formData.get("id"));
  const message = String(formData.get("message") || "");
  if (!id) return;

  // Dados de envio (se a ação for um disparo real via template aprovado).
  const rows = (await sql`
    SELECT send_to, send_conv_id, send_template, send_vars, channel
    FROM reserva.agent_approvals WHERE id = ${id} AND status = 'pending'
  `) as Array<{ send_to: string | null; send_conv_id: number | null; send_template: string | null; send_vars: Record<string, string> | null; channel: string | null }>;
  const a = rows[0];
  // Ação externa (disparo real de WhatsApp pra prefeitura) = só Admin.
  if (a?.send_template && !canDeployExternal(me.role)) {
    throw new Error("Só Admin pode aprovar envio de WhatsApp pra prefeituras.");
  }
  // Sugestões de melhoria (Engenheiro/UX/UI/Produto) → enfileira p/ a IA implementar.
  const ehMelhoria = (a?.channel ?? "").startsWith("Melhoria");
  const execStatus = ehMelhoria ? "queued" : null;

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
        send_status = ${sendStatus}, send_result = ${sendResult},
        exec_status = ${execStatus}, exec_updated_at = ${execStatus ? new Date().toISOString() : null}
    WHERE id = ${id} AND status = 'pending'
  `;
  revalidatePath("/"); revalidatePath("/crm"); revalidatePath("/licita");
}

// Botão "Deploy" nos itens já construídos (exec_status='built') → enfileira o
// merge do PR (o mini processa → Vercel deploya → 'done').
export async function deployApproval(formData: FormData) {
  // Deploy em produção (merge do PR) = só Admin.
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`
    UPDATE reserva.agent_approvals SET exec_status = 'deploy_queued', exec_updated_at = now()
    WHERE id = ${id} AND exec_status = 'built'
  `;
  revalidatePath("/"); revalidatePath("/crm"); revalidatePath("/licita");
}

export async function rejectApproval(formData: FormData) {
  const me = await requireApprove();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`
    UPDATE reserva.agent_approvals
    SET status = 'rejected', decided_at = now(), decided_by = ${me.email}
    WHERE id = ${id} AND status = 'pending'
  `;
  revalidatePath("/"); revalidatePath("/crm"); revalidatePath("/licita");
}

// Re-tenta um item que falhou (ex.: "fetch failed" transiente) — volta pra fila
// da IA. Não faz deploy: reconstrói e gera novo PR pra revisão.
export async function retryApproval(formData: FormData) {
  await requireApprove();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`
    UPDATE reserva.agent_approvals
    SET exec_status = 'queued', exec_log = null, exec_pr = null, exec_review = null,
        exec_preview = null, exec_updated_at = now()
    WHERE id = ${id} AND exec_status = 'failed'
  `;
  revalidatePath("/"); revalidatePath("/crm"); revalidatePath("/licita");
}

// Resolver/dispensar um alerta CRÍTICO de produção (depois de resolvido/reconhecido).
export async function resolverCritico(formData: FormData) {
  const me = await requireApprove();
  const id = Number(formData.get("id"));
  if (!id) return;
  await sql`
    UPDATE reserva.agent_approvals
    SET status = 'resolvido', decided_at = now(), decided_by = ${me.email}
    WHERE id = ${id} AND severidade = 'critico' AND status = 'pending'
  `;
  revalidatePath("/"); revalidatePath("/crm"); revalidatePath("/licita");
}

// ── Gestão de usuários (Admin) ──────────────────────────────────────────────
export type UserFormState = { error?: string; ok?: string } | undefined;

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("agentes_role") || "");
  const password = String(formData.get("password") || "");
  if (!email || !name || !role) return { error: "Preencha e-mail, nome e papel." };
  if (!AGENTES_ROLES.includes(role as (typeof AGENTES_ROLES)[number])) return { error: "Papel inválido." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "E-mail inválido." };
  // senha: usa a digitada, ou gera uma forte e legível pra você repassar
  const senha = password || `i10-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    const r = await upsertAgentesUser(email, name, role, senha);
    revalidatePath("/usuarios");
    return {
      ok: r.created
        ? `✅ ${name} criado. Login: ${email} · Senha: ${senha} — copie e envie pra pessoa (não aparece de novo).`
        : `✅ Acesso de ${name} atualizado (já existia; senha mantida).`,
    };
  } catch (e) {
    return { error: "Falhou: " + String((e as Error).message).slice(0, 120) };
  }
}

export async function changeRoleAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const role = String(formData.get("agentes_role") || "");
  if (!id) return;
  if (role === "revogar") { await setAgentesRole(id, null); }
  else if (AGENTES_ROLES.includes(role as (typeof AGENTES_ROLES)[number])) { await setAgentesRole(id, role); }
  revalidatePath("/usuarios");
}
