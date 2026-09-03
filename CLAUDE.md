# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BlockIntel is an AI-powered smart contract security analyzer. This is a monorepo of two independently-run packages (no shared root `package.json`, each with its own `bun.lock`):

- `api/` — Express backend: wallet-based (SIWE-style) authentication for Ethereum and Solana, Prisma/PostgreSQL, Redis, and AI contract analysis via a multi-provider free-tier LLM client (Groq → OpenRouter → Gemini).
- `app/` — Next.js 16 / React 19 frontend: contract editor, wallet connect UI, analysis views.

## Commands

### Backend (`api/`)
Run from `api/`. Package manager: bun.
- `bun run dev` — start with nodemon, loads `.env`
- `bun run local` — start with nodemon, loads `.env.local` via env-cmd
- `bun run start` — production start (`node server.js`)
- `bun run lint` — eslint
- `npx prisma generate` — regenerate the Prisma client after editing `prisma/schema.prisma`
- `npx prisma migrate dev` — create/apply a migration

No test suite exists yet.

Required env vars: `PORT`, `REDIS_URL`, `DATABASE_URL`, `JWT_SECRET`, and at least one of `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY`. Several modules fail fast at import time if their var is missing — `src/utils/db.js` (`DATABASE_URL`), `src/utils/redis.js` (`REDIS_URL`), `src/utils/jwt.js` (`JWT_SECRET`), `src/utils/llmClient.js` (throws unless at least one AI provider key is set). Follow this fail-fast pattern for any new required config. All three AI provider keys are free, no billing account needed: Groq (https://console.groq.com/keys), OpenRouter (https://openrouter.ai/keys, has `:free`-suffixed models), Gemini (https://aistudio.google.com/apikey — note: AI-Studio-issued keys can come back from a newly-created project with an account-level 401/403/404 block that no code change fixes, see below). `{GROQ,OPENROUTER,GEMINI}_MODEL` and `..._FALLBACK_MODELS` (comma-separated) override the per-provider model list; `AI_PROVIDER` forces one provider to the front of the fallback order.

### Frontend (`app/`)
Run from `app/`. Package manager: bun.
- `bun run dev` — Next.js dev server
- `bun run build` — production build (React Compiler is enabled via `reactCompiler: true` in `next.config.ts`)
- `bun run start` — serve production build
- `bun run lint` — eslint (`eslint-config-next`)

No test suite exists yet.

Frontend calls the backend via `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8080/v1` (`src/api/client.ts`) — this does not match the backend's own default port (3000), so set both explicitly when running the two together locally.

## Architecture

### Auth flow (spans both packages)
Wallet auth is a nonce challenge/response, not password- or cookie-session-based:
1. Frontend calls `GET /v1/auth/nonce?address&chain` → backend generates a UUID nonce, caches `{address, chain}` in Redis as `auth:<nonce>` (180s TTL, see `CACHE_CONFIG` in `api/src/utils/redis.js`), and returns a SIWE-style message built by `api/src/utils/siwe.js`.
2. Frontend has the wallet sign that exact message. `app/src/lib/wallet.ts` discovers wallets via EIP-6963 (falling back to legacy `window.ethereum`) for EVM chains, and the Wallet Standard (falling back to legacy `window.solana`/`window.solflare`) for Solana.
3. Frontend calls `POST /v1/auth/verify` with `{nonce, signature}`. The backend re-derives the message from the cached `{address, chain}` — it never trusts a client-supplied message — verifies it with the chain-appropriate verifier in `api/src/utils/verifySignature.js` (`ethers.verifyMessage` for EVM, `tweetnacl` + `bs58` for Solana), deletes the nonce, and upserts the user by `walletAddress`.
4. Backend returns a short-lived access JWT plus a 1-year refresh JWT (`api/src/utils/jwt.js`); the frontend persists both in `localStorage` via `app/src/store/auth-store.ts` (zustand).

To support a new chain, add a verifier to the `verifiers` map in `verifySignature.js` and a discovery/connect/sign implementation in `wallet.ts`.

### Backend request flow
`server.js` connects Redis and Postgres before calling `app.listen`. Route groups are registered declaratively in `src/routes/index.js` (an array of `{name, file}` mounted under `/v1`) rather than a chain of `app.use` calls — add new route groups there. Each route composes Joi validation (`src/middleware/validate.middleware.js`) → `auth.middleware.js` (for protected routes) → controller → service. `CorCrud` (`src/utils/CorCrud.js`) is a thin generic wrapper around a single Prisma model (e.g. `new CorCrud("users")`); services use it instead of importing `prisma` directly.

### AI analysis flow (spans both packages)
`POST /v1/contracts/:id/analyze` (`api/src/controller/analysis.controller.js` → `src/services/analysis.service.js`) reads the contract's source straight off disk and calls `generateJson()` in `src/utils/llmClient.js`, a small multi-provider client that tries Groq, then OpenRouter, then Gemini (whichever have keys configured), and within each provider tries its configured model-fallback list, until one returns valid JSON containing the required keys — free-tier providers are each unreliable in their own way (rate limits, deprecated model names, or — as hit during development — a Gemini API key whose underlying Google Cloud project gets account-level-denied with no code fix), so this is what keeps analysis working when any single one is down. Only the gemini provider gets true schema-constrained decoding (`RESPONSE_SCHEMA`, a `@google/genai` `Type`-based schema, in `analysis.service.js`); Groq/OpenRouter get the same shape spelled out in the prompt text instead (`JSON_SHAPE`) and their reply is parsed with `llmClient.js`'s `parseJson()`, which strips `<think>` blocks and markdown fences before falling back to scanning for the outermost `{...}` span. The desired shape either way is `{ summary, keyFeatures, attacks, improvements }` — the same as `app/src/types/analysis.ts` — and `compiler`/`linesOfCode`/`estimatedGasAvg` are merged in afterward, computed deterministically from the contract's own compile result rather than asked of the model. The result is cached on `contracts.analysis`/`analyzedAt`; a request is served from cache unless `analyzedAt` predates the last `compiledAt` (i.e. the source changed) or the caller passes `{ force: true }`.

On the frontend, `project-store.ts`'s `compileContract` fires `analyzeContract` in the background right after a successful compile (it doesn't block the compile→playground redirect); `ContractShell.tsx` also fires it on mount if the active contract is already compiled but has no cached analysis yet (e.g. a page reload). Both write into `editor-store.ts`'s `analysis`/`analyzing`/`analysisError` state, which `SummaryView`/`AttacksView`/`ImprovementsView` read directly instead of the hardcoded empty state they used before this existed.

### Frontend structure
Next.js App Router with a `(shell)` route group (`app/src/app/(shell)/`) that wraps all main pages in a persistent Header/Sidebar/Footer: `/`, `/projects`, `/settings`, and `/contract/[id]/{summary,attacks,improvements,playground}`. Client state lives in three zustand stores: `auth-store.ts` (wallet session, persisted to `localStorage`), `project-store.ts` (project list/CRUD state), and `editor-store.ts` (active contract source, language, target chain — the language↔chain pairing is enforced through `CHAIN_LANGUAGES`). `src/api/client.ts` is the single axios instance used for all backend calls, alongside typed request functions in `src/api/auth.ts`, `src/api/projects.ts`, and `src/api/contracts.ts`.

Components never call `src/api/*` directly — only `auth-store.ts` and `project-store.ts` do, wrapping each call in `queryClient.fetchQuery`/`invalidateQueries` (the shared `QueryClient` from `src/lib/query-client.ts`) so TanStack Query's cache/dedup sits underneath plain store actions. Components call the store's actions (e.g. `useProjectStore((s) => s.fetchProjects)`); they never construct queries or mutations themselves. Keep new data flows in this shape: component → store action → `api/*` function wrapped in the shared `queryClient`.

## Things to check before relying on them

- CORS in `api/src/app.js` is currently wide open (`origin: "*"`) — tighten this before any production deployment.
- Neither `/auth/nonce` nor `/auth/verify` is rate-limited; the nonce endpoint is unauthenticated and cheap to spam.
- `api/src/app.js` configures a multer uploader (`dest: "../contracts/"`) that isn't wired to any route yet.
- `/contracts/:id/analyze` isn't rate-limited either, and every free-tier AI provider has its own per-minute/per-day request caps — heavy concurrent use will start returning 502s from `analysis.service.js` once all configured providers are exhausted.
- The `GEMINI_API_KEY` currently in `.env`/`.env.local` returns inconsistent 401/403/404 errors (invalid credential, project denied access, deprecated model — different error on different attempts), which points to the key itself being invalid rather than a transient outage. Groq and OpenRouter keys are both live and working as of this writing and don't depend on Gemini at all.
- The hardcoded default model names in `llmClient.js` (`buildGroqProvider`/`buildOpenRouterProvider`/`buildGeminiProvider`) were verified against each provider's live `/models` endpoint (or a trial request) when last touched — free-tier model lineups get deprecated/renamed often, so if `bot.log` shows every model in a provider's list 404ing, re-check that provider's current model list rather than assuming the account/key is the problem.
