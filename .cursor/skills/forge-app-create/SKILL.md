---
name: forge-app-create
description: Guides creation, deployment, and installation of Atlassian Forge apps (Jira widgets, Confluence macros, issue panels, dashboard gadgets, etc.). Use when building any Forge app. Provides automated forge create workflow, module selection, CLI commands, and deployment scripts.
license: Apache-2.0
labels:
  - confluence
  - jira
  - bitbucket
  - atlassian
  - forge
maintainer: amoore
namespace: cloud
---
# Forge App Builder

## Critical Rules

1. **Always use `forge create`** to scaffold apps — it registers the app and generates a valid app ID
2. **Never manually scaffold** — apps without valid app IDs cannot be deployed
3. **If `forge create` fails, STOP** — inform the user and provide the manual command
4. **Never ask for API tokens in chat** — direct users to run `forge login` in their terminal and enter credentials there
5. **Always ask the user to choose** when multiple options exist (developer spaces, sites) — never pick on their behalf
6. **Always ask the user for their Atlassian site URL** — never try to discover it from other apps, environment variables, or any other source
7. **Always enable theming for Custom UI apps** — call `view.theme.enable()` from `@forge/bridge` in the frontend entry point. Without this, `--ds-*` design token CSS variables are not injected and the app will look unstyled

## Forge Knowledge Tools

Call these MCP tools during the workflow for up-to-date documentation. They are kept current and should be preferred over hardcoded references.

| Tool | Use for |
|------|---------|
| `forge-development-guide` | Prerequisites (Node version, CLI install), development setup, CLI commands, deployment, debugging, project structure, code standards |
| `list-forge-modules` | Discovering all available modules by product (Jira, Confluence, Bitbucket, Compass, JSM, Rovo) |
| `forge-ui-kit-developer-guide` | Frontend components, hooks, bridge APIs |
| `forge-backend-developer-guide` | Backend resolvers, storage, server-side patterns |
| `forge-app-manifest-guide` | Manifest configuration, scopes, permissions |
| `confluence-macro-developer-guide` | Confluence macro development |
| `jira-service-management-assets-guide` | JSM Assets CMDB integration |
| `search-forge-docs` | Search for specific APIs, props, module configuration, or CLI flags |

## Agent Workflow

### Step 0: Prerequisites (Install Automatically If Missing)

**Before any other steps**, call the `forge-development-guide` tool to get the current Node.js version requirement and CLI setup instructions. Then check and install prerequisites:

1. **Node.js** — Run `node -v`. If missing or below the version specified in the development guide:
   - **macOS (Homebrew):** `brew install node`
   - **nvm:** `nvm install <version>` then `nvm use <version>`
   - **fnm:** `fnm install <version>` then `fnm use <version>`
   - **Other:** https://nodejs.org (LTS)

2. **Forge CLI** — Run `forge --version`. If missing:
   ```bash
   npm install -g @forge/cli
   ```

3. **Forge login** — Run `forge whoami`. If not logged in:
   - **Never ask for or accept API tokens in chat** — tokens are sensitive; the user must enter them only in their terminal
   - Direct the user to create an API token: https://id.atlassian.com/manage/api-tokens
   - Tell the user to run `forge login` **in their own terminal** (not via the agent). The CLI will prompt for:
     - Atlassian email
     - API token (paste only in the terminal when prompted)
   - Example message: *"You need to log in to Forge. Create an API token at https://id.atlassian.com/manage/api-tokens, then run `forge login` in your terminal. Enter your email and token when prompted — do not paste them here."*
   - After the user confirms they've logged in, retry the workflow

Install in order: Node.js first (required for npm), then Forge CLI, then login. Retry the workflow after installing.

### Step 1: Discover Developer Spaces

Run from the skill directory (e.g. `skills/forge/forge-app-create/skill`). Use `python3` on macOS if `python` is not available.

```bash
python3 -m scripts.get_dev_spaces --json
```

### Step 2: Ask User to Choose Developer Space

Use the AskQuestion tool to present the discovered spaces.

### Step 3: Create App

Run from the skill directory. The `--directory` flag sets the **parent directory** where the app folder will be created (e.g. the user's workspace). If omitted, the app is created in the current directory.

```bash
python3 -m scripts.create_forge_app \
  --template <template> \
  --name <app-name> \
  --dev-space-id <selected-id> \
  --directory <parent-directory>
```

To find the right template for the user's needs:
- Call `list-forge-modules` to identify the appropriate module type
- Call `search-forge-docs` with a query like "template for <module type>" to find the matching template name

Validate a template: `python3 -m scripts.list_templates --validate <name>`
List all templates: `python3 -m scripts.list_templates --list`

### Step 4: Customize Code

After `forge create` succeeds:

```bash
cd <app-name>
npm install
```

Use the Forge knowledge tools for implementation:
- `forge-ui-kit-developer-guide` — Frontend components
- `forge-backend-developer-guide` — Backend resolvers and APIs
- `forge-app-manifest-guide` — Manifest configuration
- `search-forge-docs` — Search for specific APIs or props

#### Enable Theming (Custom UI only)

Custom UI apps run in an iframe and do **not** receive Atlassian design tokens (`--ds-*` CSS variables) by default. You **must** opt in by calling `view.theme.enable()` from `@forge/bridge` during app initialization. Without this, all `var(--ds-*)` references will fall back to their hardcoded defaults and the app will not match the host Jira/Confluence theme (light/dark).

Add this to the frontend entry point (e.g. `src/index.js`) **before** rendering:

```js
import { view } from '@forge/bridge';

// Fetches the active theme from the host app (Jira/Confluence)
// and injects --ds-* CSS custom properties into the iframe.
// Also reactively syncs when the user switches themes.
view.theme.enable();
```

This is **not needed for UI Kit apps** — theming is automatic there.

After enabling theming, use Atlassian design tokens in CSS:

```css
.example {
  background: var(--ds-surface-raised);
  color: var(--ds-text);
  padding: var(--ds-space-100);
  border: 1px solid var(--ds-border);
}
```

### Step 5: Deploy

```bash
python3 -m scripts.deploy_forge_app \
  --app-dir <app-directory> \
  --site <site-url> \
  --product <jira|confluence>
```

Or manually:

```bash
forge deploy --non-interactive -e development
```

### Step 6: Install

**Always ask the user** for their Atlassian site URL (e.g. `yourcompany.atlassian.net`). Never try to discover it automatically from other apps or any other source. Then:

```bash
forge install \
  --site <site-url> \
  --product <Jira|Confluence|Bitbucket> \
  --environment development \
  --confirm-scopes \
  --non-interactive
```

If scopes changed from a previous installation, add `--upgrade`.

## Handling `forge create` Failures

When `forge create` fails, **never attempt workarounds or manual scaffolding**.

| Error | Action |
|-------|--------|
| Prerequisites missing (Node.js, Forge CLI) | Run Step 0 install commands, then retry |
| "Prompts can not be meaningfully rendered" | Ask user to run `forge create` in an interactive terminal |
| "No developer spaces found" | Direct user to https://developer.atlassian.com/console/ |
| "directory already exists" | The `--directory` flag is the parent directory, not the app root. Check the path is correct and that no folder with the app name already exists inside it |
| Network/auth issues, not logged in | Direct user to https://id.atlassian.com/manage/api-tokens, then run `forge login` in their terminal |
| Any other error | Show error, ask user for guidance |

Example response when it fails:

```
forge create needs an interactive terminal. Please run:

  forge create --template jira-dashboard-gadget my-app-name

Once created, let me know and I'll help customize it.
```

## Module Selection

Call `list-forge-modules` for a comprehensive, up-to-date list of all available modules organized by product. Then use `search-forge-docs` with the module name for configuration details and YAML examples.

## Scripts

| Script | Purpose |
|--------|--------|
| `scripts/get_dev_spaces.py` | Discover developer spaces via GraphQL API. Run: `python3 -m scripts.get_dev_spaces --json` |
| `scripts/create_forge_app.py` | Create app with dev space selection and template validation. Supports `--directory <parent-directory>`. Run: `python3 -m scripts.create_forge_app` |
| `scripts/list_templates.py` | List/validate all Forge templates from Atlassian registry. Run: `python3 -m scripts.list_templates` |
| `scripts/deploy_forge_app.py` | Deploy and install app (prerequisites check, npm install, lint, deploy, install). Run: `python3 -m scripts.deploy_forge_app` |

## Troubleshooting

For CLI commands, debugging techniques, and common error patterns, call `forge-development-guide`. For quick checks:

- **Not logged in / auth failed**: Create API token at [id.atlassian.com/manage/api-tokens](https://id.atlassian.com/manage/api-tokens), then run `forge login` in your terminal (never paste token in chat)
- **App not appearing after install**: Check `forge logs -e development --limit 50`, verify manifest with `forge lint`, re-install with `--upgrade` if scopes changed
- **"forge: command not found"**: `npm install -g @forge/cli`
- **Custom UI app has no theming / looks unstyled**: You forgot to call `view.theme.enable()` from `@forge/bridge`. This is required for Custom UI apps — without it, `--ds-*` design token CSS variables are not injected into the iframe. Add `view.theme.enable()` to the frontend entry point before rendering. This is not needed for UI Kit apps.
