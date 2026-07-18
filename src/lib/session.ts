import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "ag_session";
const PATH = "/agentes";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"
);

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export async function createSession(p: SessionPayload) {
  const token = await new SignJWT(p as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PATH,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const c = await cookies();
  c.set(COOKIE, "", { path: PATH, maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
