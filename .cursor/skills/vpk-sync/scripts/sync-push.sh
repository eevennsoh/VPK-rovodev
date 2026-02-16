#!/bin/bash
#
# sync-push.sh - Push local changes to upstream VPK via GitHub PR
#
# Usage: sync-push.sh [options]
#   --branch NAME    Branch name for PR
#   --title "..."    PR title
#   --body "..."     PR body/description
#   --paths "..."    Only push specific paths (space-separated)
#   --use-fork       Push via fork
#   --dry-run        Preview only

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BRANCH_NAME=""
PR_TITLE=""
PR_BODY=""
PATHS=""
USE_FORK=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--branch)
			BRANCH_NAME="$2"
			shift 2
			;;
		--title)
			PR_TITLE="$2"
			shift 2
			;;
		--body)
			PR_BODY="$2"
			shift 2
			;;
		--paths)
			PATHS="$2"
			shift 2
			;;
		--use-fork)
			USE_FORK=true
			shift
			;;
		--dry-run)
			DRY_RUN=true
			shift
			;;
		-*)
			echo -e "${RED}Unknown option: $1${NC}"
			exit 1
			;;
		*)
			shift
			;;
	esac
done

# Read config if exists
CONFIG_FILE=".vpk-sync.json"
UPSTREAM_BRANCH="main"
FORK_REMOTE="origin"
if [[ -f "$CONFIG_FILE" ]]; then
	UPSTREAM_BRANCH=$(grep -o '"defaultBranch"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 || echo "main")
	CONFIG_USE_FORK=$(grep -o '"useFork"[[:space:]]*:[[:space:]]*[^,}]*' "$CONFIG_FILE" | grep -o 'true\|false' || echo "false")
	if [[ "$CONFIG_USE_FORK" == "true" ]]; then
		USE_FORK=true
	fi
	FORK_REMOTE=$(grep -o '"forkRemote"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 || echo "origin")
fi

# Generate branch name if not provided
if [[ -z "$BRANCH_NAME" ]]; then
	TIMESTAMP=$(date +%Y%m%d-%H%M%S)
	BRANCH_NAME="vpk-sync/$TIMESTAMP"
fi

echo -e "${BLUE}VPK Sync Push${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Branch:     ${GREEN}$BRANCH_NAME${NC}"
echo -e "Target:     ${GREEN}upstream/$UPSTREAM_BRANCH${NC}"
echo -e "Via fork:   ${GREEN}$USE_FORK${NC}"
if [[ -n "$PATHS" ]]; then
	echo -e "Paths:      ${GREEN}$PATHS${NC}"
fi
echo ""

if $DRY_RUN; then
	echo -e "${YELLOW}[DRY RUN] Would perform the following:${NC}"
	echo ""
fi

# Check GitHub CLI is authenticated
if ! gh auth status &>/dev/null; then
	echo -e "${RED}✗ GitHub CLI not authenticated${NC}"
	echo "Run: gh auth login"
	exit 1
fi
echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"

# Check for upstream remote
UPSTREAM_URL=$(git remote get-url upstream 2>/dev/null || echo "")
if [[ -z "$UPSTREAM_URL" ]]; then
	echo -e "${RED}✗ No upstream remote configured${NC}"
	echo "Run: /vpk-sync --init"
	exit 1
fi

# Extract owner/repo from upstream URL
UPSTREAM_REPO=$(echo "$UPSTREAM_URL" | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')
echo -e "Upstream:   ${GREEN}$UPSTREAM_REPO${NC}"

# Check for changes
echo ""
echo -e "${BLUE}Changes to push:${NC}"
if [[ -n "$PATHS" ]]; then
	# Show changes for specific paths
	CHANGES=$(git diff --stat HEAD -- $PATHS 2>/dev/null || echo "")
	if [[ -z "$CHANGES" ]]; then
		# Check if paths have uncommitted changes
		CHANGES=$(git status --porcelain -- $PATHS 2>/dev/null || echo "")
	fi
else
	# Show all changes vs upstream
	CHANGES=$(git diff --stat upstream/$UPSTREAM_BRANCH...HEAD 2>/dev/null || echo "")
fi

if [[ -z "$CHANGES" ]]; then
	echo -e "${YELLOW}No changes to push${NC}"
	exit 0
fi

echo "$CHANGES"

# Generate PR title if not provided
if [[ -z "$PR_TITLE" ]]; then
	# Try to generate from recent commits
	RECENT_COMMIT=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
	if [[ -n "$RECENT_COMMIT" ]]; then
		PR_TITLE="$RECENT_COMMIT"
	else
		PR_TITLE="Sync changes from prototype"
	fi
fi

# Generate PR body if not provided
if [[ -z "$PR_BODY" ]]; then
	PR_BODY="## Summary

Changes synced from a VPK prototype implementation.

## Changes

$(git log --oneline upstream/$UPSTREAM_BRANCH..HEAD 2>/dev/null | head -10 || echo "- Local changes")

---

🤖 Created with [VPK Sync](https://github.com/eevennsoh/VPK)"
fi

echo ""
echo -e "${BLUE}PR Details:${NC}"
echo -e "  Title: $PR_TITLE"
echo ""

# Create and push branch
CURRENT_BRANCH=$(git branch --show-current)

if ! $DRY_RUN; then
	# Create new branch from current state
	echo "Creating branch $BRANCH_NAME..."
	git checkout -b "$BRANCH_NAME"

	if [[ -n "$PATHS" ]]; then
		# For selective paths, we need to create a clean branch and add only those files
		echo "Preparing selective sync..."
		# The files should already be in the current state, just commit if needed
		if [[ -n "$(git status --porcelain -- $PATHS)" ]]; then
			git add $PATHS
			git commit -m "$PR_TITLE" || true
		fi
	fi

	# Determine where to push
	if $USE_FORK; then
		PUSH_REMOTE="$FORK_REMOTE"
	else
		# Try pushing to upstream directly
		PUSH_REMOTE="upstream"
	fi

	echo "Pushing to $PUSH_REMOTE..."
	if git push -u "$PUSH_REMOTE" "$BRANCH_NAME" 2>/dev/null; then
		echo -e "${GREEN}✓ Pushed to $PUSH_REMOTE/$BRANCH_NAME${NC}"
	else
		if ! $USE_FORK; then
			echo -e "${YELLOW}! Cannot push to upstream directly, trying fork...${NC}"
			PUSH_REMOTE="$FORK_REMOTE"
			if git push -u "$PUSH_REMOTE" "$BRANCH_NAME"; then
				echo -e "${GREEN}✓ Pushed to $PUSH_REMOTE/$BRANCH_NAME${NC}"
				USE_FORK=true
			else
				echo -e "${RED}✗ Failed to push${NC}"
				git checkout "$CURRENT_BRANCH"
				git branch -D "$BRANCH_NAME"
				exit 1
			fi
		else
			echo -e "${RED}✗ Failed to push to fork${NC}"
			git checkout "$CURRENT_BRANCH"
			git branch -D "$BRANCH_NAME"
			exit 1
		fi
	fi

	# Create PR
	echo ""
	echo "Creating pull request..."

	if $USE_FORK; then
		# Get fork owner from remote
		FORK_URL=$(git remote get-url "$FORK_REMOTE" 2>/dev/null || echo "")
		FORK_OWNER=$(echo "$FORK_URL" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
		HEAD_REF="$FORK_OWNER:$BRANCH_NAME"
	else
		HEAD_REF="$BRANCH_NAME"
	fi

	PR_URL=$(gh pr create \
		--repo "$UPSTREAM_REPO" \
		--head "$HEAD_REF" \
		--base "$UPSTREAM_BRANCH" \
		--title "$PR_TITLE" \
		--body "$PR_BODY" \
		2>&1)

	if [[ $? -eq 0 ]]; then
		echo -e "${GREEN}✓ Pull request created!${NC}"
		echo ""
		echo -e "  ${BLUE}$PR_URL${NC}"
	else
		echo -e "${YELLOW}! Could not create PR automatically${NC}"
		echo "Create manually at: https://github.com/$UPSTREAM_REPO/compare/$UPSTREAM_BRANCH...$BRANCH_NAME"
	fi

	# Return to original branch
	git checkout "$CURRENT_BRANCH"
	echo ""
	echo -e "${GREEN}Push complete!${NC}"
	echo "Returned to branch: $CURRENT_BRANCH"

else
	echo -e "${YELLOW}[DRY RUN] Would:${NC}"
	echo "  1. Create branch: $BRANCH_NAME"
	echo "  2. Push to: $(if $USE_FORK; then echo $FORK_REMOTE; else echo 'upstream'; fi)"
	echo "  3. Create PR: $PR_TITLE"
	echo "  4. Target: $UPSTREAM_REPO/$UPSTREAM_BRANCH"
fi
