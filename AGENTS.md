# agentes-i10

Painel "Central de Agentes i10" — command-center web que recebe execuções da fleet de agentes (Mac mini `agent-hq`), mostra insights/críticos de produção e gerencia aprovações de ações internas. Servido sob o path `/agentes` de institutoi10.com.br.

## Stack

- **Linguagem:** TypeScript (`strict: true`), target ES2022.
- **Framework:** Next.js `^16.2.3` (App Router, React `^19`, Server Actions, Turbopack). **Leia os guias em `node_modules/next/dist/docs/` antes de escrever código** — esta versão do Next tem breaking changes vs. versões anteriores.
- **Banco:** PostgreSQL (Neon) via `@neondatabase/serverless` (tagged template `sql\`...\``). Schema `reserva` (tabelas `reserva.users`, `agent_runs`, `agent_approvals`).
- **Auth:** sessão própria com `jose` (JWT HS256, cookie `ag_session`) + `bcryptjs`. Papéis via campo `agentes_role` em `reserva.users`.
- **Deploy:** Vercel, auto-deploy da `main`.
- **Package manager:** npm (lockfile = `package-lock.json`).

## Comandos

Do `package.json` (não há test/lint configurados):

- `npm run dev` — dev server (Next + Turbopack).
- `npm run build` — build de produção.
- `npm run start` — serve o build.

Não há script de teste nem de lint no momento — ver seções Testes e CI/CD.

## Estrutura

- `src/app/` — App Router. `page.tsx` (command center), `layout.tsx`, rotas de seção (`crm/`, `licita/`, `juri/`, `historico/`, `usuarios/`, `login/`).
- `src/app/actions.ts` — Server Actions.
- `src/app/api/agents/` — endpoints REST: `ingest` (publicação de runs pelo Mac mini), `status`, `insights`, `approvals`.
- `src/components/` — UI: `command-center`, `insights-panels`, `critico-banner`, `exec-section`, `approvals-section`, `auto-refresh`, forms de login/usuário.
- `src/lib/` — `db.ts` (cliente Neon lazy), `auth.ts` (papéis/permissões), `session.ts` (JWT/cookie), `fleet-data.ts`, `anchor.ts`.
- `next.config.mjs` — `basePath: "/agentes"` + `turbopack.root`.
- `vercel.json` — redirect `/` → `/agentes`.

## Convenções de código

- TypeScript `strict`. Alias `@/*` → `src/*`.
- Módulos server-only (`db.ts`, `auth.ts`, `session.ts`) importam `"server-only"` — **nunca** os importe em componentes client.
- Rotas de API/ingestão que tocam dados: `export const dynamic = "force-dynamic"`.
- Acesso a banco sempre pelo `sql` de `src/lib/db.ts` (cliente é criado no 1º uso em runtime — não instanciar no build, onde `DATABASE_URL` não existe). Não trocar o wrapper por Proxy: quebra a detecção do tagged-template.
- Comentários e strings de UI em português.

## Variáveis de ambiente

Nomes referenciados no código (nunca commitar valores; `.env*` está no `.gitignore`):

- `DATABASE_URL` — Neon (schema `reserva`).
- `AUTH_SECRET` — assina o JWT de sessão (há fallback inseguro só para dev; **defina em produção**).
- `AGENTS_INGEST_SECRET` — header `x-agent-secret` exigido no endpoint `ingest`; se ausente, ingestão responde 503.
- `AGENT_SEND_SECRET` — segredo para disparo de ações externas.
- `CRM_SEND_URL` — endpoint do CRM para envio.
- `NODE_ENV` — controla flag `secure` do cookie.

Local: `.env.local`. Produção: variáveis no projeto Vercel.

## CI/CD & Deploy

Não há workflows em `.github/` hoje. Deploy é o auto-deploy da Vercel a partir da `main`.

Recomendado (via PR): workflow mínimo `ci.yml` que rode `npm ci` + `npx tsc --noEmit` + `npm run build` em push/PR para `main`. Adicionar ESLint (`eslint-config-next`) e um `lint` script fecha a lacuna de qualidade.

## Boas práticas de PR

- Branches: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- Conventional Commits (o histórico já segue `feat(...)`, `fix(...)`).
- PRs pequenos; descreva impacto em ingestão/aprovações/permissões.
- Checklist: `npm run build` passa, `tsc --noEmit` limpo, **sem segredos**, mudanças de schema `reserva` com script/rollback, screenshots para mudanças de UI.
- ≥1 review; squash merge; `main` sempre deployável (é o que a Vercel publica).

## Testes

Sem testes hoje. Proporcional ao tamanho: priorize testes das regras de permissão em `src/lib/auth.ts` (`canSeeAgentes` e afins) e da validação do payload de `ingest`, que são o núcleo de segurança do painel.

## Segurança & dados

- Painel interno com controle de acesso por papel (`agentes_role`: admin / aprovador / visualizador). Não afrouxar checagens; `admin` deploya e dispara ações externas, `aprovador` só aprova internas, `visualizador` só lê.
- `agentes_role` é isolado do `role` compartilhado com outros apps em `reserva.users` — não confundir os dois.
- Endpoints `ingest`/envio são protegidos por segredo compartilhado (header) — nunca logar o segredo nem aceitar requisição sem ele.
- Nunca commitar `.env*`. `AUTH_SECRET` obrigatório em produção (o fallback é só dev).
- Se dados de execução contiverem dados pessoais, tratar sob LGPD.

## Gotchas

- **`basePath: "/agentes"`** — tudo vive sob `/agentes`; APIs são `/agentes/api/agents/*`. Links absolutos e chamadas de fetch precisam respeitar o basePath.
- **Cliente Neon lazy** — não chamar `sql` em tempo de build/módulo top-level; `DATABASE_URL` só existe em runtime.
- **Next 16 + React 19** — APIs assíncronas (`cookies()`, `headers()`) e Server Actions seguem a convenção nova; confira os docs empacotados antes de assumir comportamento antigo.
- **`ingest` responde 503** se `AGENTS_INGEST_SECRET` não estiver setado — configure antes de esperar dados do Mac mini.
