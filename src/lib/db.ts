import { neon } from "@neondatabase/serverless";

// DATABASE_URL vem do ambiente da Vercel (produção) e do .env.local (dev).
export const sql = neon(process.env.DATABASE_URL || "");
