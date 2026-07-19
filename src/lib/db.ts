import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Cliente criado só no 1º uso (runtime) — nunca no build, onde DATABASE_URL
// não é injetado. O wrapper preserva a chamada tagged-template do neon
// (sql`...`), diferente de um Proxy, que quebrava a detecção do template.
let _sql: NeonQueryFunction<false, false> | null = null;
function getClient(): NeonQueryFunction<false, false> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL || "");
  return _sql;
}

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getClient()(strings, ...values)) as unknown as NeonQueryFunction<false, false>;
