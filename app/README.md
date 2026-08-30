# BlockIntel — frontend

Next.js 16 / React 19 app for BlockIntel, an AI-powered smart contract security analyzer: contract editor, wallet connect UI, and analysis views.

## Getting started

Package manager: bun.

```bash
bun install
bun run dev
```

The app calls the backend (see `../api/`) via `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8080/v1`. Set it explicitly in `.env.local` if the backend runs on a different port.

See the root `CLAUDE.md` for architecture notes (auth flow, store/api layering, route structure).
