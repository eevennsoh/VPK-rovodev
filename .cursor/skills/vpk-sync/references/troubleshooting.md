# Troubleshooting

> Common issues and resolutions for vpk-sync operations.

## "No upstream remote configured"

Run init first:

```bash
/vpk-sync --init
```

## "Uncommitted changes detected"

Options:

1. Stash: `git stash` → sync → `git stash pop`
2. Commit: `git add . && git commit -m "WIP"`
3. Discard: `git checkout .` (loses changes)

## "Merge conflicts"

1. Open conflicting files (marked with `<<<<<<<`)
2. Resolve conflicts manually
3. Stage resolved files: `git add <file>`
4. Continue: `git merge --continue` or `git rebase --continue`

## "Permission denied on push"

Options:

1. Use fork: `/vpk-sync --push --use-fork`
2. Request write access to upstream
3. Create fork manually and update config

## "gh CLI not authenticated"

```bash
gh auth login
```

## "Entirely different commit histories" or "refusing to merge unrelated histories"

This happens when your repo was created before `/vpk-share --create` was updated to preserve commit history.

**For pulling updates (most common):**

```bash
# Re-run with --allow-unrelated-histories
/vpk-sync --pull --allow-unrelated-histories
```

**For pulling orphan branches:**

```bash
# Use the pull-orphan workflow
/vpk-sync --pull-orphan <branch-name>

# Or manually:
git checkout main
git checkout -b <branch>-rebased
git cherry-pick <commit-sha>  # Skip the boilerplate commit
git push -u origin <branch>-rebased
gh pr create --base main --head <branch>-rebased
```

**Note:** New projects created with `/vpk-share --create` now preserve VPK's commit history, so this won't be needed for future projects.
