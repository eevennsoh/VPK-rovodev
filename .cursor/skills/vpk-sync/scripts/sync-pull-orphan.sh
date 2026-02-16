#!/bin/bash
# sync-pull-orphan.sh - Pull orphan branches (no common history) into main
#
# Usage: sync-pull-orphan.sh [branch-name] [options]
#   --dry-run       Preview only, don't make changes
#   --auto-merge    Automatically merge the PR after creation
#   --cleanup       Delete the rebased branch after merge
#
# This script handles branches that have no common commit history with main,
# typically created from fresh VPK boilerplate exports.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BRANCH_NAME=""
DRY_RUN=false
AUTO_MERGE=false
CLEANUP=false

while [[ $# -gt 0 ]]; do
	case $1 in
		--dry-run)
			DRY_RUN=true
			shift
			;;
		--auto-merge)
			AUTO_MERGE=true
			shift
			;;
		--cleanup)
			CLEANUP=true
			shift
			;;
		-*)
			echo -e "${RED}Unknown option: $1${NC}"
			exit 1
			;;
		*)
			BRANCH_NAME="$1"
			shift
			;;
	esac
done

echo -e "${BLUE}=== VPK Sync: Pull Orphan Branch ===${NC}"

# Fetch latest from origin
echo -e "${YELLOW}Fetching latest from origin...${NC}"
git fetch origin

# If no branch specified, list available branches
if [ -z "$BRANCH_NAME" ]; then
	echo -e "${YELLOW}Available remote branches (excluding main):${NC}"
	git branch -r | grep -v 'origin/main' | grep -v 'HEAD' | sed 's/origin\//  /'
	echo ""
	echo -e "${RED}Please specify a branch name as argument${NC}"
	exit 1
fi

# Check if branch exists on remote
if ! git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
	echo -e "${RED}Branch 'origin/$BRANCH_NAME' not found${NC}"
	exit 1
fi

# Check if branch has common history with main
echo -e "${YELLOW}Checking commit history...${NC}"
if git merge-base --is-ancestor origin/main "origin/$BRANCH_NAME" 2>/dev/null; then
	echo -e "${GREEN}Branch has common history with main - use normal merge/PR instead${NC}"
	exit 0
fi

echo -e "${YELLOW}Branch has no common history with main - will use cherry-pick approach${NC}"

# Get commits on the orphan branch
echo -e "${YELLOW}Commits on $BRANCH_NAME:${NC}"
git log "origin/$BRANCH_NAME" --oneline

# Identify commits to cherry-pick (skip boilerplate commits)
# Usually the first commit is the boilerplate export, subsequent commits are the actual changes
COMMIT_COUNT=$(git rev-list --count "origin/$BRANCH_NAME")
echo -e "${BLUE}Total commits: $COMMIT_COUNT${NC}"

if [ "$COMMIT_COUNT" -eq 1 ]; then
	echo -e "${YELLOW}Only one commit found - this might be just a boilerplate export${NC}"
	COMMITS_TO_PICK=$(git rev-list "origin/$BRANCH_NAME" | head -1)
else
	# Skip the first (oldest) commit which is usually the boilerplate
	COMMITS_TO_PICK=$(git rev-list "origin/$BRANCH_NAME" | head -n -1 | tac)
fi

echo -e "${YELLOW}Commits to cherry-pick:${NC}"
for commit in $COMMITS_TO_PICK; do
	git log --oneline -1 "$commit"
done

if [ "$DRY_RUN" = true ]; then
	echo -e "${BLUE}[DRY RUN] Would create branch ${BRANCH_NAME}-rebased from main${NC}"
	echo -e "${BLUE}[DRY RUN] Would cherry-pick commits listed above${NC}"
	echo -e "${BLUE}[DRY RUN] Would create PR to merge into main${NC}"
	exit 0
fi

# Create new branch from main
REBASED_BRANCH="${BRANCH_NAME}-rebased"
echo -e "${YELLOW}Creating branch $REBASED_BRANCH from main...${NC}"

# Ensure we're on main first
git checkout main
git pull origin main

# Check if rebased branch already exists
if git show-ref --verify --quiet "refs/heads/$REBASED_BRANCH"; then
	echo -e "${YELLOW}Branch $REBASED_BRANCH already exists locally, deleting...${NC}"
	git branch -D "$REBASED_BRANCH"
fi

git checkout -b "$REBASED_BRANCH"

# Cherry-pick commits
echo -e "${YELLOW}Cherry-picking commits...${NC}"
CHERRY_PICK_FAILED=false
for commit in $COMMITS_TO_PICK; do
	echo -e "${BLUE}Cherry-picking: $(git log --oneline -1 $commit)${NC}"
	if ! git cherry-pick "$commit" --no-edit; then
		echo -e "${RED}Cherry-pick failed for $commit${NC}"
		echo -e "${YELLOW}Conflicts in:${NC}"
		git diff --name-only --diff-filter=U
		echo ""
		echo -e "${YELLOW}Resolve conflicts, then run:${NC}"
		echo "  git add <resolved-files>"
		echo "  git cherry-pick --continue"
		echo ""
		echo -e "${YELLOW}Or skip this commit:${NC}"
		echo "  git cherry-pick --skip"
		echo ""
		echo -e "${YELLOW}Then push and create PR:${NC}"
		echo "  git push -u origin $REBASED_BRANCH"
		echo "  gh pr create --base main --head $REBASED_BRANCH"
		CHERRY_PICK_FAILED=true
		break
	fi
done

if [ "$CHERRY_PICK_FAILED" = true ]; then
	exit 1
fi

# Push branch
echo -e "${YELLOW}Pushing $REBASED_BRANCH to origin...${NC}"
git push -u origin "$REBASED_BRANCH"

# Create PR
echo -e "${YELLOW}Creating pull request...${NC}"
PR_TITLE="Merge $BRANCH_NAME changes into main"
PR_BODY="## Summary
Cherry-picked commits from \`$BRANCH_NAME\` branch which had no common history with main.

### Original branch
- Branch: \`$BRANCH_NAME\`
- Rebased to: \`$REBASED_BRANCH\`

### Commits included
$(for commit in $COMMITS_TO_PICK; do git log --oneline -1 "$commit"; done)
"

PR_URL=$(gh pr create --base main --head "$REBASED_BRANCH" --title "$PR_TITLE" --body "$PR_BODY")
echo -e "${GREEN}PR created: $PR_URL${NC}"

# Auto-merge if requested
if [ "$AUTO_MERGE" = true ]; then
	echo -e "${YELLOW}Merging PR...${NC}"
	PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
	gh pr merge "$PR_NUMBER" --merge
	echo -e "${GREEN}PR merged successfully${NC}"
	
	# Update local main
	git checkout main
	git pull origin main
fi

# Cleanup if requested
if [ "$CLEANUP" = true ] && [ "$AUTO_MERGE" = true ]; then
	echo -e "${YELLOW}Cleaning up branches...${NC}"
	git branch -d "$REBASED_BRANCH" 2>/dev/null || true
	git push origin --delete "$REBASED_BRANCH" 2>/dev/null || true
	echo -e "${GREEN}Cleanup complete${NC}"
fi

echo -e "${GREEN}=== Done ===${NC}"
