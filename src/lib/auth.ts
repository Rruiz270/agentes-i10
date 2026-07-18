import "server-only";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { getSession, type SessionPayload } from "./session";

// Reaproveita o mesmo store de usuários (reserva.users), mas isolado neste app.
// Acesso ao painel de Agentes: perfil "total".
export type UserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  password_hash: string;
};

export async function findUser(email: string): Promise<UserRow | undefined> {
  const rows = (await sql`
    SELECT id, email, name, role, password_hash
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

export function canSeeAgentes(role: string | undefined): boolean {
  return role === "total";
}
