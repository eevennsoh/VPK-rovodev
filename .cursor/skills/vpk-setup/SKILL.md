---
name: vpk-setup
description: This skill should be used when the user asks to "set up", "get started", "first time setup",
  "new project setup", "initialize VPK", "run for first time", "configure VPK", "install dependencies",
  "generate ASAP credentials", "configure environment", "start dev servers", "bootstrap", "init",
  "env setup", "how do I start", "how do I set up the project", "get this working",
  or wants to set up a new VPK project from scratch. Also triggered by errors like
  "ASAP key not working", "credentials not found", "env not configured".
disable-model-invocation: true
argument-hint: "[email]"
prerequisites: []
produces: [.env.local, .asap-config]
---

# VPK Setup - Initial Repository Setup

**Goal:** Get the prototype running locally with the default required runtime: RovoDev Serve as primary chat backend plus AI Gateway fallback (including Google gateway vars for image and voice generation).

## Quick Workflow

1. **Preflight cleanup** → If `node_modules` exists, clean Next.js cache (see below)
2. **Install dependencies** → `pnpm install` (skip if `node_modules` already exists)
3. **Collect AI Gateway credentials** → Ask for use case ID and Atlassian email
4. **Configure AI Gateway** → Generate ASAP keys and create `.env.local` with fallback + Google endpoint values
5. **Start servers** → `pnpm run rovodev` (starts RovoDev Serve + backend + frontend)
6. **Verify** → http://localhost:3000 (or the port shown in terminal output)

## Preflight Cleanup (when node_modules exists)

If `node_modules/` already exists, **always** perform proactive cleanup before starting dev servers to avoid stale lock files and corrupted Turbopack cache:

```bash
if [ -d "node_modules" ]; then
  echo "node_modules exists - performing preflight cleanup..."
  rm -f .next/dev/lock
  rm -rf .next
  echo "Cleanup complete. Skipping pnpm install."
fi
```

This prevents common issues:

- `Unable to acquire lock at .next/dev/lock`
- `Failed to restore task data (corrupted database or bug)`
- `ArrayLengthMismatch` Turbopack errors

## Essential Commands

```bash
# Preflight cleanup (if node_modules exists)
if [ -d "node_modules" ]; then
  rm -f .next/dev/lock
  rm -rf .next
fi

# Install dependencies (skip if node_modules exists)
[ ! -d "node_modules" ] && pnpm install

# Start everything: RovoDev Serve + backend + frontend
pnpm run rovodev

# Verify backend health
curl http://localhost:8080/api/health
```

## Runtime Topology

### Always-On Default

`pnpm run rovodev` starts all three processes in one terminal:

```text
rovodev serve (:8000) + Express (:8080) + Next.js (:3000)
```

RovoDev Serve handles primary chat. AI Gateway fallback is always enabled, and Google endpoint variables are always configured for `provider: "google"` image and TTS routes.
RovoDev billing defaults to `https://hello.atlassian.net` and can be overridden via `ROVODEV_SITE_URL`.

## AI Gateway Credential Setup

Required for the default setup path.

### Step 0: Gather User Information

**Atlassian email address**

- Try: `git config user.email`
- If not set or not @atlassian.com, ask user for it
- Needed for: `.env.local` (`AI_GATEWAY_USER_ID`)

**AI Gateway use case ID** (REQUIRED for AI Gateway - always ask user)

- User must provide their own use case ID
- Can request one from #help-ai-gateway channel if they don't have it
- Needed for: `.env.local` (`AI_GATEWAY_USE_CASE_ID`), ASAP key generation

### AI Gateway Credential Commands

```bash
# Generate ASAP credentials (CRITICAL: generate timestamp ONCE!)
# Replace YOUR-USE-CASE-ID with the user's provided use case ID
TIMESTAMP=$(date +%s)
echo "Using timestamp: $TIMESTAMP"
atlas asap key generate --key YOUR-USE-CASE-ID/$TIMESTAMP --file .asap-config
atlas asap key save --key YOUR-USE-CASE-ID/$TIMESTAMP --service YOUR-USE-CASE-ID --env staging --file .asap-config

# Note: You'll need to authenticate when prompted (browser will open)

# Create .env.local from .asap-config
# Script location: .cursor/skills/vpk-setup/scripts/create-env-local.js
node ./.cursor/skills/vpk-setup/scripts/create-env-local.js YOUR-USE-CASE-ID
# Optional (explicit email override):
# node ./.cursor/skills/vpk-setup/scripts/create-env-local.js YOUR-USE-CASE-ID your-email@atlassian.com
```

### What `.env.local` Looks Like (Default Mode)

```bash
# AI Gateway Configuration
AI_GATEWAY_URL=https://ai-gateway.us-east-1.staging.atl-paas.net/v1/bedrock/model/anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream
AI_GATEWAY_URL_GOOGLE=https://ai-gateway.us-east-1.staging.atl-paas.net/v1/google/publishers/google/v1/chat/completions
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview
GOOGLE_TTS_MODEL=tts-latest
AI_GATEWAY_USE_CASE_ID=your-use-case-id
AI_GATEWAY_CLOUD_ID=local-testing
AI_GATEWAY_USER_ID=your-email@atlassian.com

# ASAP Credentials
ASAP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
ASAP_KID=your-use-case-id/1234567890
ASAP_ISSUER=your-use-case-id

# Enable AI Gateway fallback when RovoDev is unavailable
AUTO_FALLBACK_TO_AI_GATEWAY=true

# Default billing site for rovodev serve (override if needed)
ROVODEV_SITE_URL=https://hello.atlassian.net

# RovoDev pool size (agents-team parallel runs, default: 6)
# ROVODEV_POOL_SIZE=6
```

## Environment Variables Reference

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `AUTO_FALLBACK_TO_AI_GATEWAY` | Yes | Must be `true` to route to AI Gateway when RovoDev is unavailable |
| `ROVODEV_SITE_URL` | Yes | Billing site URL for `rovodev serve` (default: `https://hello.atlassian.net`) |
| `ROVODEV_POOL_SIZE` | Optional | Concurrent RovoDev instances for agents team (default: 6) |
| `ROVODEV_PORT` | Optional | Explicit RovoDev Serve port override (normally auto-managed via `.dev-rovodev-port`) |
| `AI_GATEWAY_URL` | Yes | Default model endpoint (Bedrock/OpenAI/Google) |
| `AI_GATEWAY_URL_GOOGLE` | Yes | Google endpoint for `provider: "google"` requests + TTS route |
| `AI_GATEWAY_USE_CASE_ID` | Yes | Your AI Gateway use case ID |
| `AI_GATEWAY_CLOUD_ID` | Yes | Cloud ID (use `local-testing` for local dev) |
| `AI_GATEWAY_USER_ID` | Yes | Your Atlassian email |
| `OPENAI_MODEL` | Optional | GPT model ID (default: `gpt-5.2-2025-12-11`) |
| `GOOGLE_IMAGE_MODEL` | Yes | Gemini image model (default: `gemini-3-pro-image-preview`) |
| `GOOGLE_TTS_MODEL` | Yes | TTS model (default: `tts-latest`) |
| `ASAP_PRIVATE_KEY` | Yes | RSA private key (quoted, `\n` escaped) |
| `ASAP_KID` | Yes | Key ID from ASAP config |
| `ASAP_ISSUER` | Yes | Issuer from ASAP config |
| `CONFLUENCE_BASE_URL` | Optional | Confluence base URL for run-summary sharing (e.g. `https://your-site.atlassian.net/wiki`) |
| `CONFLUENCE_USER_EMAIL` | Optional | Atlassian email for Confluence API auth |
| `CONFLUENCE_API_TOKEN` | Optional | Confluence API token (from Atlassian account settings) |
| `CONFLUENCE_DEFAULT_SPACE_KEY` | Optional | Default Confluence space key for run summaries |
| `CONFLUENCE_PARENT_PAGE_ID` | Optional | Optional parent page ID for run-summary pages |
| `SLACK_BOT_TOKEN` | Optional | Slack bot token (`xoxb-…`) for run-summary DM sharing |
| `SLACK_DM_USER_ID` | Optional | Slack user ID to send run-summary DMs to |
| `NEXT_PUBLIC_API_URL` | Production | API URL for production static export builds |
| `PORT` | Optional | Backend port override (default: 8080) |
| `BACKEND_URL` | Optional | Frontend → backend URL override (default: http://localhost:8080) |
| `DEBUG` | Optional | Set `true` for verbose backend logging |

## Model Switching (AI Gateway Fallback Mode)

Model switching via `.env.local` applies only when using AI Gateway (RovoDev manages its own model internally).

| Provider | Model | Endpoint |
| -------- | ----- | -------- |
| **Claude (Default)** | `anthropic.claude-haiku-4-5-20251001-v1:0` | `/v1/bedrock/model/{MODEL_ID}/invoke-with-response-stream` |
| **GPT** | `gpt-5.2-2025-12-11` | `/v1/openai/v1/chat/completions` |
| **Gemini** | `gemini-3-pro-image-preview` | `/v1/google/publishers/google/v1/chat/completions` |

Update `AI_GATEWAY_URL` in `.env.local` then restart with `pnpm run rovodev`.

For full model switching details, see [references/guide-model-switch.md](references/guide-model-switch.md).

## Setup Checklist

- [ ] Node.js 18+ installed
- [ ] **Preflight cleanup** (if `node_modules` exists: remove `.next/dev/lock` and `.next/`)
- [ ] Dependencies installed (skip if `node_modules` already exists)
- [ ] **User info collected** (email, use case ID)
- [ ] Atlas CLI installed, YubiKey enrolled
- [ ] **ASAP credentials generated (timestamp generated ONCE)**
- [ ] `.env.local` created via `create-env-local.js`
- [ ] `AUTO_FALLBACK_TO_AI_GATEWAY=true` enabled in `.env.local`
- [ ] `ROVODEV_SITE_URL` is set (default: `https://hello.atlassian.net`)
- [ ] Google endpoints enabled in `.env.local`
- [ ] Dev servers started with `pnpm run rovodev`
- [ ] Health check passes at http://localhost:8080/api/health
- [ ] Chat responds at http://localhost:3000

## Quick Troubleshooting

| Issue | Quick Fix |
| ----- | --------- |
| Chat returns 503 | RovoDev Serve not running — use `pnpm run rovodev` to start all processes |
| Auth errors during ASAP save | `atlas upgrade` |
| "EADDRINUSE" error | Servers auto-find available ports (3001+/8081+). If still failing, run with `--force-kill`: `./.cursor/skills/vpk-setup/scripts/start-dev.sh --force-kill` |
| Next.js lock error | Remove stale lock: `rm -f .next/dev/lock` then restart |
| Turbopack cache corrupted | Clear cache: `rm -rf .next` then restart |
| Zombie processes blocking ports | Force kill: `lsof -ti:3000,8000,8080 \| xargs kill -9` |
| Frontend 500 (providers) | Ensure `components/providers.tsx` matches import casing |
| "ASAP_PRIVATE_KEY: MISSING" | Check .env.local format - private key must be quoted and escaped |
| No AI response (RovoDev) | Verify `pnpm run rovodev` is running and RovoDev Serve started successfully |
| No AI response (AI Gateway) | Verify health check passes and `AUTO_FALLBACK_TO_AI_GATEWAY=true` is set |
| **Mismatched ASAP KID** | **You generated timestamp twice! Regenerate with single timestamp** |
| "Model Id [X] not found" | Model not whitelisted. Run `atlas ml aigateway usecase view --id YOUR-USE-CASE-ID -e stg-west` |
| Bedrock 403 while OpenAI works | Pull latest branch and confirm `backend/lib/ai-gateway-helpers.js` does **not** rewrite Bedrock URL; restart backend |
| Want to switch models | See [Model Switching Guide](references/guide-model-switch.md) |
| Stale AI context / wrong answers | RovoDev session may be corrupted — restart with `pnpm run rovodev` |

### Port Auto-Discovery

VPK dev servers automatically find available ports if defaults are in use:

- **Frontend**: Tries ports 3000+ (configurable via `PORT` env var)
- **RovoDev Serve**: Tries ports 8000+ (worktree-aware)
- **Backend**: Tries ports 8080+ (configurable via `BACKEND_PORT` env var)

**Worktree-aware:** Each git worktree gets a deterministic port range based on its name, preventing conflicts when running multiple worktrees simultaneously.

```bash
pnpm ports  # Show port assignments for all worktrees
```

The actual ports are written to `.dev-rovodev-port`, `.dev-frontend-port`, and `.dev-backend-port` at runtime. Playwright/agent-browser tools automatically read these files via a PreToolUse hook.

## Next Steps

- **Develop locally:** Run `pnpm run rovodev` in your terminal (Ctrl+C to stop)
- **Ready to deploy?** Use `/vpk-deploy` to create a permanent, shareable URL
- **Make changes:** Edit code, test locally, then commit and `/vpk-deploy` again

### Cloned from VPK?

If you cloned VPK to start a new prototype, consider these additional steps:

| Step | Command | Description |
| ---- | ------- | ----------- |
| **Create your own repo** | `/vpk-share --create my-project` | Creates a new GitHub repo with VPK sync configured |
| **Standalone repo** | `/vpk-share --create my-project --no-upstream` | Creates repo without VPK sync (for external users) |
| **Configure sync only** | `/vpk-sync --init` | If staying in the cloned repo, configure upstream sync |
| **Pull VPK updates** | `/vpk-sync --pull` | Get latest improvements from VPK |
| **Push improvements** | `/vpk-sync --push` | Contribute your improvements back to VPK via PR |

**Recommended workflow:**

1. `/vpk-setup` — Configure credentials and start dev servers
2. `/vpk-share --create my-project` — Create your own repo (optional but recommended)
3. Develop your prototype
4. `/vpk-sync --push` — Share improvements back to VPK
5. `/vpk-sync --pull` — Get VPK updates periodically

## References

- [Setup Guide](references/guide-setup.md) - Detailed setup documentation
- [Model Switching Guide](references/guide-model-switch.md) - Switch between Claude, GPT, Gemini (AI Gateway-enabled mode)
