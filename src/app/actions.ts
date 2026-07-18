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
  await sql`
    UPDATE reserva.agent_approvals
    SET status = 'approved', message = ${message},
        decided_at = now(), decided_by = ${me.email}
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
