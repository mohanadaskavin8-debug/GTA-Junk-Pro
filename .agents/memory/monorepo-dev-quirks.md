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
