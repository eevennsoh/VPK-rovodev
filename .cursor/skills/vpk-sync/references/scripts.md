# VPK Sync Script Reference

All scripts are located in `.cursor/skills/vpk-sync/scripts/`.

## sync-init.sh

Initialize upstream connection and configuration.

```bash
sync-init.sh [upstream-url] [options]
  --branch NAME    Default branch (default: main)
  --strategy STR   merge or rebase (default: merge)
  --dry-run        Preview only
```

**Examples:**

```bash
# Initialize with default upstream
./.cursor/skills/vpk-sync/scripts/sync-init.sh

# Initialize with custom upstream
./.cursor/skills/vpk-sync/scripts/sync-init.sh https://github.com/your-org/vpk-fork

# Preview what would happen
./.cursor/skills/vpk-sync/scripts/sync-init.sh --dry-run
```

---

## sync-pull.sh

Pull updates from upstream repository.

```bash
sync-pull.sh [options]
  --rebase         Use rebase instead of merge
  --stash          Auto-stash uncommitted changes
  --paths "..."    Only sync specific paths (space-separated)
  --dry-run        Preview only
```

**Examples:**

```bash
# Standard merge pull
./.cursor/skills/vpk-sync/scripts/sync-pull.sh

# Rebase for cleaner history
./.cursor/skills/vpk-sync/scripts/sync-pull.sh --rebase

# Auto-stash uncommitted changes
./.cursor/skills/vpk-sync/scripts/sync-pull.sh --stash

# Preview what would change
./.cursor/skills/vpk-sync/scripts/sync-pull.sh --dry-run
```

---

## sync-push.sh

Push changes to upstream via pull request.

```bash
sync-push.sh [options]
  --branch NAME    Branch name for PR
  --title "..."    PR title
  --body "..."     PR body/description
  --paths "..."    Only push specific paths (space-separated)
  --use-fork       Push via fork
  --dry-run        Preview only
```

**Examples:**

```bash
# Push all changes
./.cursor/skills/vpk-sync/scripts/sync-push.sh --title "Add new feature"

# Push specific paths only
./.cursor/skills/vpk-sync/scripts/sync-push.sh --title "Update component" --paths "components/blocks/my-feature/"

# Push via fork (if no direct write access)
./.cursor/skills/vpk-sync/scripts/sync-push.sh --title "Fix bug" --use-fork

# Preview PR
./.cursor/skills/vpk-sync/scripts/sync-push.sh --title "Test" --dry-run
```

---

## sync-pull-orphan.sh

Pull an orphan branch (branch with no common commit history) into main.

```bash
sync-pull-orphan.sh [branch-name] [options]
  --dry-run        Preview only, don't make changes
  --auto-merge     Automatically merge the PR after creation
  --cleanup        Delete the rebased branch after merge
```

**Examples:**

```bash
# Interactive (will prompt for branch selection)
./.cursor/skills/vpk-sync/scripts/sync-pull-orphan.sh

# Pull specific branch
./.cursor/skills/vpk-sync/scripts/sync-pull-orphan.sh fix-composer

# Pull and auto-cleanup
./.cursor/skills/vpk-sync/scripts/sync-pull-orphan.sh feature-branch --auto-merge --cleanup

# Preview what would happen
./.cursor/skills/vpk-sync/scripts/sync-pull-orphan.sh feature-branch --dry-run
```

---

## Common Patterns

### First-time sync setup

```bash
# 1. Initialize upstream
./.cursor/skills/vpk-sync/scripts/sync-init.sh

# 2. Check status
git fetch upstream
git rev-list --count HEAD..upstream/main  # commits behind
git rev-list --count upstream/main..HEAD  # commits ahead
```

### Regular sync workflow

```bash
# Pull updates
./.cursor/skills/vpk-sync/scripts/sync-pull.sh

# Make changes, then push
./.cursor/skills/vpk-sync/scripts/sync-push.sh --title "Your change description"
```

### Handling orphan branches

When GitHub shows "entirely different commit histories":

```bash
# Use the pull-orphan script
./.cursor/skills/vpk-sync/scripts/sync-pull-orphan.sh branch-name
```
