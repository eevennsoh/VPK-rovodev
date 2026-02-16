# VPK Boilerplate Checklist

## Credentials and secrets
- No `.env.local`, `.env`, or `.env.*` files (except `.env.local.example`).
- No `.asap-config` file.
- No private keys or certs (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`).
- No hardcoded tokens or secrets in `service-descriptor.yml`, `backend/server.js`, or `rovo/config.js`.

## Build artifacts and caches
- No `node_modules/` (root or `backend/`).
- No `.next/`, `out/`, `build/`, `coverage/`, `.turbo/`, `.cache/`, `dist/`.
- No `.pnpm-store/`, `.pnp*`, `.yarn/` artifacts.
- No debug logs (`*.log`, `npm-debug.log*`, `yarn-debug.log*`, `.pnpm-debug.log*`).
- No `*.tsbuildinfo` or `next-env.d.ts`.

## Placeholders and templates
- `service-descriptor.yml` uses placeholders (`YOUR-SERVICE-NAME`, `your-email@atlassian.com`).
- `.env.local.example` uses placeholders (no real IDs, emails, or keys).
- README/guide docs do not include real credentials.

## Sanity checks
- No `node_modules/` directories (requires fresh `pnpm install`).
- `pnpm install` works from the export.
- `pnpm run dev` starts frontend and backend.
- `/api/health` responds when backend runs.
