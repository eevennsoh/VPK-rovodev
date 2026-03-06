---
name: vpk-share
description: This skill should be used when the user asks to "create a new project", "create a repo",
  "fork VPK", "make a copy", "clone and customize", "export boilerplate", "share VPK",
  "reset project", "clean project", "initialize new repo", "start fresh", "clean slate",
  "start a new project", "new repo", "copy this project", "duplicate VPK",
  "create GitHub repo", "how do I share this", "how do I create a repo",
  or wants to create a GitHub repository from VPK.
disable-model-invocation: true
argument-hint: "[--create <name>] [--export] [--reset] [--no-upstream] [--public]"
prerequisites: []
produces: []
---

# VPK Share

Create and share VPK projects.

## Quick Start

| Command                                    | Action                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| `/vpk-share --create my-app`               | Create GitHub repo with VPK sync (can contribute back) |
| `/vpk-share --create my-app --no-upstream` | Create standalone GitHub repo (no VPK connection)      |
| `/vpk-share --export`                      | Export sanitized boilerplate (no GitHub repo)          |
| `/vpk-share --reset`                       | Clean current project (comprehensive)                  |

## Prerequisites

- **GitHub CLI** (`gh`) installed and authenticated (for `--create`)
- **rsync** installed (for `--export` and `--create --no-upstream`)

---

## Interactive Workflow (Default)

When invoked without flags, use `AskUserQuestion` to determine what the user wants:

```yaml
header: "Action"
question: "What would you like to do?"
options:
  - label: "Create new project with GitHub repo"
    description: "Create repo, optionally configure VPK sync"
  - label: "Export boilerplate"
    description: "Sanitized copy for manual distribution (no GitHub)"
  - label: "Reset current project"
    description: "Comprehensive cleanup (credentials, caches, build artifacts)"
```

---

## Create Workflow (`--create`)

Creates a new project in a sibling directory and pushes to a new GitHub repository.

### What It Does

The behavior differs based on whether upstream sync is enabled:

**With upstream (default):**

1. **Clones VPK repository** — preserves full commit history
2. **Renames origin to upstream** — VPK becomes the upstream remote
3. **Cleans sensitive files** — removes `.env*`, credentials, local config
4. **Commits initialization** — marks the divergence point from VPK
5. **Creates GitHub repo** — `gh repo create <name>` and sets as `origin`
6. **Configures sync** — creates `.vpk-sync.json`

**Standalone (`--no-upstream`):**

1. **Copies project files** — excludes `.git`, `node_modules`, `.next`, `.env*`, etc.
2. **Initializes fresh git** — `git init && git add -A && git commit`
3. **Creates GitHub repo** — `gh repo create <name> --source=. --push`

### Upstream Configuration

| Flag            | History        | Sync                             | Use Case                 |
| --------------- | -------------- | -------------------------------- | ------------------------ |
| (default)       | Preserved      | `/vpk-sync --pull` works cleanly | Contributing back to VPK |
| `--no-upstream` | Fresh (orphan) | No sync configured               | Standalone projects      |

**Why history matters:**

- **Preserved history** — clean merges from upstream, no "unrelated histories" errors
- **Fresh history** — cleaner `git log` for your project, no VPK commit noise

**Use cases:**

- **With upstream (default):** For users who may contribute improvements back to VPK
- **Without upstream (`--no-upstream`):** For external users or fully standalone prototypes

### Agent Instructions

1. If `<name>` not provided, use `AskUserQuestion`:

   ```yaml
   header: "Project name"
   question: "What should the new project be named?"
   options:
     - label: "Enter custom name"
       description: "Lowercase with hyphens (e.g., my-awesome-app)"
   ```

2. Ask about upstream:

   ```yaml
   header: "VPK Sync"
   question: "Configure upstream sync with VPK?"
   options:
     - label: "Yes (Recommended)"
       description: "Can pull VPK updates and push improvements back"
     - label: "No (Standalone)"
       description: "Completely independent project"
   ```

3. Ask for visibility:

   ```yaml
   header: "Visibility"
   question: "Should the repository be public or private?"
   options:
     - label: "Private (Recommended)"
       description: "Only you and collaborators can see it"
     - label: "Public"
       description: "Anyone on the internet can see it"
   ```

4. Run the script:

   ```bash
   bash .cursor/skills/vpk-share/scripts/build_vpk_boilerplate.sh --create <name> [--public] [--no-upstream]
   ```

5. Report the resulting GitHub URL.

6. Remind the user to:
   - `cd ../<project-name>` to enter the new project
   - Run `pnpm install` or `/vpk-setup` to set up the new project

7. If upstream was configured, mention:
   - `/vpk-sync --pull` to get VPK updates
   - `/vpk-sync --push` to contribute improvements back

---

## Export Workflow (`--export`)

Exports a sanitized boilerplate copy without creating a GitHub repository.

### What It Does

1. **Copies project files** — excludes credentials, build artifacts, local config
2. **Removes sensitive files** — scans for any remaining secrets
3. **Initializes fresh git repo** — NO remote origin (prevents accidental pushes)
4. **Verifies cleanliness** — fails if sensitive files remain

### Use Cases

- Distributing VPK to others who will set up their own repo manually
- Creating a zip archive for sharing
- Preparing a clean starting point

### Agent Instructions

1. Ask for destination (optional):

   ```yaml
   header: "Destination"
   question: "Where should the export be created?"
   options:
     - label: "Default (../VPK-boilerplate)"
       description: "Sibling directory with -boilerplate suffix"
     - label: "Custom path"
       description: "Specify a custom destination"
   ```

2. Run the script:

   ```bash
   bash .cursor/skills/vpk-share/scripts/build_vpk_boilerplate.sh --export [--dest PATH] [--force]
   ```

3. Report what was created.

4. Remind the user of next steps:
   - `cd <dest>`
   - `pnpm install`
   - `git remote add origin <url>`

---

## Reset Workflow (`--reset`)

Comprehensive in-place cleanup of the current project.

### What Gets Removed

| Category            | Items                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **Credentials**     | `.env.local`, `.env`, `.asap-config`, `.deploy.local`                     |
| **Dev state**       | `.dev-pids`, `.dev-backend-port`, `.api-routes-backup`                    |
| **Local config**    | `*.local.md`, `*.local.json`, `.vpk-sync.json`                            |
| **Dependencies**    | `node_modules/`, `backend/node_modules/`                                  |
| **Build artifacts** | `.next/`, `out/`, `build/`, `.turbo/`, `.cache/`, `coverage/`, `.vercel/` |

### Validation

After reset, the script checks `service-descriptor.yml` for placeholder values and warns if real service names are detected.

### Agent Instructions

1. Confirm the user wants to reset:

   ```yaml
   header: "Confirm Reset"
   question: "This will remove credentials, dependencies, and build artifacts. Continue?"
   options:
     - label: "Yes, reset"
     - label: "No, cancel"
   ```

2. Run the script:

   ```bash
   bash .cursor/skills/vpk-share/scripts/build_vpk_boilerplate.sh --reset [--dry-run]
   ```

3. Report what was cleaned.

4. Remind the user to run `pnpm install` or `/vpk-setup` to restore the project.

---

## Files Excluded from Copy

When using `--create` or `--export`, these are excluded:

| Category            | Files/Directories                                                      |
| ------------------- | ---------------------------------------------------------------------- |
| **Git**             | `.git/`                                                                |
| **Dependencies**    | `node_modules/`, `backend/node_modules/`, `.pnpm-store/`               |
| **Build artifacts** | `.next/`, `out/`, `build/`, `dist/`, `.turbo/`, `.cache/`, `coverage/` |
| **Credentials**     | `.env*`, `.asap-config`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`   |
| **Local config**    | `*.local.md`, `*.local.json`, `.vpk-sync.json`                         |
| **Dev state**       | `.dev-pids`, `.dev-backend-port`                                       |
| **IDE**             | `.idea/`, `.vscode/`                                                   |
| **Misc**            | `.DS_Store`, `*.log`, `tmp/`, `.tmp/`                                  |

---

## VPK Sync Integration

After creating a project with upstream configured, you can:

| Command              | Action                               |
| -------------------- | ------------------------------------ |
| `/vpk-sync --pull`   | Pull latest updates from VPK         |
| `/vpk-sync --push`   | Push improvements back to VPK via PR |
| `/vpk-sync --status` | Check commits ahead/behind upstream  |
| `/vpk-sync --init`   | Reconfigure upstream if needed       |

See `/vpk-sync` skill for full sync documentation.

---

## Examples

```bash
/vpk-share --create my-project              # New repo with VPK sync (default)
/vpk-share --create my-app --no-upstream    # Standalone repo, no VPK connection
/vpk-share --create my-app --public         # Public repo
/vpk-share --export                         # Sanitized copy, no GitHub repo
/vpk-share --export --dest ../vpk-for-team  # Export to custom path
/vpk-share --reset                          # Clean credentials, deps, build artifacts
/vpk-share --reset --dry-run                # Preview what reset would remove
```

---

## Troubleshooting

### "gh: command not found" or "gh auth" errors

GitHub CLI is not installed or authenticated:

```bash
# Install gh (macOS)
brew install gh

# Authenticate
gh auth login
```

### "Directory already exists"

The target directory `../<project-name>` already exists:

```bash
# Option 1: Remove existing directory
rm -rf ../<project-name>

# Option 2: Choose a different name
/vpk-share --create my-app-v2
```

### "Not a git repository"

You must be inside a git repository to use `--create` or `--export`:

```bash
# Check if you're in a git repo
git status

# If not, initialize git first
git init
git add -A
git commit -m "Initial commit"
```

### "Permission denied" on GitHub

You don't have permission to create repositories:

```bash
# Check your authentication
gh auth status

# Re-authenticate if needed
gh auth login
```

### Script fails silently

Run with `--dry-run` to see what would happen without making changes:

```bash
bash .cursor/skills/vpk-share/scripts/build_vpk_boilerplate.sh --create my-app --dry-run
```

---

## References

- [`references/boilerplate-checklist.md`](references/boilerplate-checklist.md) — Review checklist for exported boilerplate
