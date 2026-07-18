import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazy: só lê DATABASE_URL na 1ª query (runtime), nunca no import.
// Assim o `next build` (que só importa os módulos) nunca quebra por env ausente.
let _sql: NeonQueryFunction<false, false> | null = null;

function client(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida");
    _sql = neon(url);
  }
  return _sql;
}

// Proxy que encaminha a tagged-template call e qualquer método (.query etc.)
export const sql = new Proxy((() => {}) as unknown as NeonQueryFunction<false, false>, {
  apply(_t, _this, args: unknown[]) {
    return (client() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_t, prop) {
    const c = client() as unknown as Record<string | symbol, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});
