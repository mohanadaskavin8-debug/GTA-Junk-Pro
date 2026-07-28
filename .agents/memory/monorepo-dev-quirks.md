---
name: Monorepo dev quirks
description: Non-obvious dev-loop rules for this pnpm monorepo (api-client imports, server restarts)
---

# Monorepo dev quirks

## Import generated API types from package root only
Import types/hooks from `@workspace/api-client-react`, never deep paths like
`@workspace/api-client-react/src/generated/api.schemas`.
**Why:** The package's exports map doesn't expose subpaths, so deep imports pass Vite dev
resolution but fail `tsc` typecheck — the break only surfaces later in CI-style checks.
**How to apply:** After Orval codegen, everything (types + hooks + query keys) is re-exported
from the package index; grep for `/src/generated/` in app code when typecheck fails with
"Cannot find module".

## API server has no HMR
`artifacts/api-server` dev workflow is build+start (esbuild bundle), not watch mode.
**Why:** Changes to server routes/middleware do nothing until the workflow is restarted;
the frontend (`pieceofcake-junk: web`) HMRs on its own.
**How to apply:** Always restart `artifacts/api-server: API Server` after editing server code,
then re-test endpoints.

## Orval zod codegen: avoid `format: email` in openapi.yaml
Orval v8.23 emits Zod-v4 top-level `zod.email()` for `format: email` fields while importing the v3 `zod` entrypoint (workspace zod 3.25.x) → api-server crashes on boot with "(void 0) is not a function".
**Why:** orval's zod-version detection mismatches zod 3.25's dual v3/v4 packaging.
**How to apply:** keep email fields plain `type: string` in the spec (validate format client-side), and after codegen verify `lib/api-zod/src/generated/api.ts` contains no `zod.email()`.

## drizzle-kit push crashes on mixed column add+drop
`npx drizzle-kit push --force` can crash in `columnsResolver` when one table both drops and adds columns (it wants interactive rename resolution, which dies without a TTY).
**Why:** push can't tell rename from drop+add non-interactively.
**How to apply:** run the ALTER TABLE manually via `psql "$DATABASE_URL"`, then re-run push and expect "No changes detected".
