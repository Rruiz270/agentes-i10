import "server-only";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { getSession, type SessionPayload } from "./session";

// Acesso ao painel de Agentes é controlado por um campo PRÓPRIO (agentes_role) em
// reserva.users — isolado do `role` compartilhado com outros apps. Três papéis:
//   admin        → tudo (aprova, deploya, dispara WhatsApp, gerencia usuários)
//   aprovador    → vê tudo + aprova ações internas (NÃO deploya nem envia externo)
//   visualizador → só acompanha (não decide)
export type UserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  agentes_role: string | null;
  password_hash: string;
};

export async function findUser(email: string): Promise<UserRow | undefined> {
  const rows = (await sql`
    SELECT id, email, name, role, agentes_role, password_hash
    FROM reserva.users WHERE email = ${email.toLowerCase().trim()}
  `) as UserRow[];
  return rows[0];
}

export async function verifyCredentials(email: string, password: string) {
  const u = await findUser(email);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  return ok ? u : null;
}

export async function currentUser(): Promise<SessionPayload | null> {
  return getSession();
}

// ── Papéis / permissões ─────────────────────────────────────────────────────
export function canSeeAgentes(role: string | undefined | null): boolean {
  return role === "admin" || role === "aprovador" || role === "visualizador";
}
export function isAdmin(role: string | undefined | null): boolean {
  return role === "admin";
}
export function canApprove(role: string | undefined | null): boolean {
  return role === "admin" || role === "aprovador";
}
// Ações de maior risco (deploy em produção + WhatsApp pra prefeituras): só Admin.
export function canDeployExternal(role: string | undefined | null): boolean {
  return role === "admin";
}
export function canManageUsers(role: string | undefined | null): boolean {
  return role === "admin";
}
export const AGENTES_ROLES = ["admin", "aprovador", "visualizador"] as const;
export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", aprovador: "Aprovador", visualizador: "Visualizador",
};

// ── Gestão de usuários (Admin) ──────────────────────────────────────────────
export type AgUser = { id: number; email: string; name: string; agentes_role: string };
export async function listAgentesUsers(): Promise<AgUser[]> {
  return (await sql`
    SELECT id, email, name, agentes_role
    FROM reserva.users WHERE agentes_role IS NOT NULL ORDER BY name
  `) as AgUser[];
}

// Concede/atualiza acesso. Se o e-mail já existe em reserva.users (outro app),
// só seta o agentes_role — NÃO mexe na senha nem no `role` compartilhado.
export async function upsertAgentesUser(email: string, name: string, agentesRole: string, password: string) {
  const e = email.toLowerCase().trim();
  const existing = await findUser(e);
  if (existing) {
    await sql`UPDATE reserva.users SET agentes_role = ${agentesRole}, name = ${name} WHERE email = ${e}`;
    return { created: false };
  }
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO reserva.users (email, name, password_hash, role, agentes_role, must_change)
    VALUES (${e}, ${name}, ${hash}, 'agentes', ${agentesRole}, false)
  `;
  return { created: true };
}

export async function setAgentesRole(id: number, agentesRole: string | null) {
  await sql`UPDATE reserva.users SET agentes_role = ${agentesRole} WHERE id = ${id}`;
}
