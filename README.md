# BlockIntel

BlockIntel is an AI-powered smart contract security analyzer. Users connect an Ethereum or Solana wallet, submit contract source code, and get an AI-driven breakdown of the contract's summary, key features, potential attack vectors, and suggested improvements, alongside a code playground for editing and reviewing it.

## Repository layout

This is a monorepo with two independently-run packages:

```
api/   Express backend — wallet auth (SIWE-style), Prisma/PostgreSQL, Redis
app/   Next.js 16 / React 19 frontend — wallet UI, contract editor, analysis views
```

Each package has its own `package.json`, `bun.lock`, and env files, and is started separately.

## Tech stack

**Backend (`api/`)**
- Express 5, Node/Bun
- PostgreSQL via Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`)
- Redis for short-lived auth nonce caching
- JWT (`jsonwebtoken`) for issued sessions
- `ethers` (EVM) and `tweetnacl`/`bs58` (Solana) for signature verification
- Joi for request validation, Winston for logging

**Frontend (`app/`)**
- Next.js 16 (App Router), React 19, TypeScript
- Zustand for client state
- Tailwind CSS v4
- Monaco Editor for the in-browser code editor

## How authentication works

BlockIntel uses wallet-based sign-in instead of passwords:

1. The client requests a nonce for a wallet address + chain (`GET /v1/auth/nonce`).
2. The wallet signs a human-readable challenge message containing that nonce.
3. The client submits the signature (`POST /v1/auth/verify`); the backend verifies it against the chain's signature scheme, upserts the user, and returns an access token and refresh token.
4. The frontend stores the session and uses it for subsequent authenticated requests.

Both Ethereum (via EIP-6963 / injected wallets) and Solana (via the Wallet Standard / legacy Phantom-Solflare) are supported out of the box.

## Getting started

### Backend

```bash
cd api
bun install
# create api/.env (or .env.local) with: PORT, DATABASE_URL, REDIS_URL, JWT_SECRET
npx prisma generate
npx prisma migrate dev
bun run dev
```

### Frontend

```bash
cd app
bun install
# set NEXT_PUBLIC_API_URL to point at the backend, e.g. http://localhost:3000/v1
bun run dev
```

Then open [http://localhost:3000](http://localhost:3000) (frontend) with the backend running alongside it.

## Project structure highlights

- `api/src/routes` — versioned route definitions, mounted under `/v1`
- `api/src/controller` / `api/src/services` — controllers handle req/res, services hold business logic and data access
- `api/src/utils` — cross-cutting concerns: db, redis cache, jwt, logger, signature verification
- `api/prisma/schema.prisma` — data model (`Users`, `contracts`)
- `app/src/app/(shell)` — main app pages, wrapped in shared Header/Sidebar/Footer
- `app/src/components/analyzer` — contract summary, attacks, improvements, key-features cards
- `app/src/components/editor` — Monaco-based code editor panel
- `app/src/store` — Zustand stores for auth session and editor state
- `app/src/lib` — API client, wallet discovery/connect/sign logic

For a deeper architectural walkthrough (auth flow internals, request pipeline, state management conventions), see [CLAUDE.md](./CLAUDE.md).
