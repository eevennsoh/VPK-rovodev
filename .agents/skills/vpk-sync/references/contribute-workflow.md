# Contribute Workflow Details

This document provides detailed instructions for the `--contribute` workflow.

## When to Use

Use this when you've developed features on **separate branches** and want to contribute
specific branches or commits back to upstream VPK. This is different from `--push` which
pushes commits from main.

**Key scenarios:**

- You developed a sidebar collapse feature on `feature/sidebar-collapse`
- You merged it to your project's main branch
- Now you want to contribute that feature (or specific commits from it) to upstream VPK
- You may want to exclude project-specific commits (e.g., brand colors, custom modals)

## How It Works

1. **Track with git tags** — Contributed commits are marked with `vpk-contributed/<sha>` tags
2. **Cherry-pick approach** — Selected commits are cherry-picked onto a clean branch from upstream/main
3. **Partial contributions** — The same branch can be contributed multiple times with different commits
4. **Status visibility** — `--list` shows which branches have pending vs. contributed commits

## Command Options

```bash
/vpk-sync --contribute              # Interactive: list branches, select commits
/vpk-sync --contribute --list       # List branches with contribution status
/vpk-sync --contribute <branch>     # Contribute specific branch
/vpk-sync --contribute <branch> --all                  # Include all commits
/vpk-sync --contribute <branch> --commits "1,2,4"      # Include specific commits
/vpk-sync --contribute <branch> --exclude "3,5"        # Exclude specific commits
/vpk-sync --contribute <branch> --dry-run              # Preview without making changes
```

## Agent Instructions

### Step 1: List Available Branches

```bash
./.cursor/skills/vpk-sync/scripts/sync-contribute.sh --list
```

This shows:
- Feature branches with commits ahead of upstream/main
- Number of commits on each branch
- Contribution status (not contributed / partially contributed / fully contributed)

### Step 2: Interactive Branch Selection (if no branch specified)

Use `AskUserQuestion` to present branches:

```yaml
header: "Select branch"
question: "Which branch would you like to contribute?"
options:
  # Dynamically populated from --list output
  - label: "feature/sidebar-collapse"
    description: "5 commits ahead, not contributed"
  - label: "feature/new-widget"
    description: "3 commits ahead, 1/3 contributed"
```

### Step 3: Show Commits for Selected Branch

```bash
./.cursor/skills/vpk-sync/scripts/sync-contribute.sh <branch>
```

This displays commits with their contribution status:

```
Commits on feature/sidebar-collapse:
  1. abc1234 - Add collapse hook          [pending]
  2. def5678 - Add animation              [pending]
  3. 111aaaa - Fix z-index for our modal  [pending]
  4. ghi9012 - Add localStorage           [contributed]
```

### Step 4: Allow Commit Selection via AskUserQuestion

```yaml
header: "Commit selection"
question: "Enter commit numbers to EXCLUDE (or leave blank for all pending)"
multiSelect: false
options:
  - label: "Include all pending"
    description: "Contribute commits 1, 2, 3 (excludes already contributed)"
  - label: "Exclude some"
    description: "I'll specify which to exclude"
```

If user chooses to exclude, ask for comma-separated numbers.

### Step 5: Execute Contribution

```bash
./.cursor/skills/vpk-sync/scripts/sync-contribute.sh <branch> --exclude "3,5"
# or
./.cursor/skills/vpk-sync/scripts/sync-contribute.sh <branch> --commits "1,2,4"
# or
./.cursor/skills/vpk-sync/scripts/sync-contribute.sh <branch> --all
```

### Step 6: Report PR URL

Provide link for user to review.

## Conflict Resolution

When a cherry-pick conflict occurs:

1. Script pauses and shows conflicting files
2. User resolves conflicts manually
3. User runs:
   ```bash
   git add <resolved-files>
   git cherry-pick --continue
   ```
4. Then completes the contribution:
   ```bash
   git push -u origin vpk-contribute/<branch>-<timestamp>
   gh pr create --repo <upstream> --base main --title "..."
   ```

To abort instead:

```bash
git cherry-pick --abort
git checkout <original-branch>
git branch -D vpk-contribute/<branch>-<timestamp>
```

## Tracking Mechanism

Contributed commits are tracked via git tags:

```bash
# Tag format
vpk-contributed/<commit-sha>

# Tag message format
"PR #123 on 2026-01-31 from feature/sidebar-collapse"

# Query all contributed commits
git tag -l "vpk-contributed/*"

# Check if specific commit was contributed
git tag -l "vpk-contributed/abc1234"

# View tag details
git tag -l -n1 "vpk-contributed/abc1234"
```

This allows:
- Same branch to be contributed multiple times
- Individual commit tracking independent of branches
- PR history visible in tag messages
