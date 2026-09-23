import { createHmac, randomBytes } from "node:crypto";

// Constantes do gate da Agenda de Jobs. Ficam FORA do actions.ts porque um
// arquivo "use server" só pode exportar funções async (não constantes).
export const CRONS_COOKIE = "crons_ok";

// O valor do cookie é derivado do AUTH_SECRET (que não está no repo). Antes era
// uma string fixa publicada aqui, e qualquer um podia forjar o cookie sem saber
// a senha. Sem AUTH_SECRET, cai num token aleatório por boot: o gate fecha em
// vez de abrir.
const segredo = process.env.AUTH_SECRET || randomBytes(32).toString("hex");
export const CRONS_TOKEN = createHmac("sha256", segredo).update("crons_ok:v2").digest("hex");
