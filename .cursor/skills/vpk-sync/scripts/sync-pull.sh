#!/bin/bash
#
# sync-pull.sh - Pull latest changes from upstream VPK
#
# Usage: sync-pull.sh [options]
#   --rebase                    Use rebase instead of merge
#   --stash                     Auto-stash uncommitted changes
#   --paths "..."               Only sync specific paths (space-separated)
#   --allow-unrelated-histories Allow merging repos with different commit histories
#   --dry-run                   Preview only

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
USE_REBASE=false
AUTO_STASH=false
PATHS=""
DRY_RUN=false
ALLOW_UNRELATED=false

# Parse arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--rebase)
			USE_REBASE=true
			shift
			;;
		--stash)
			AUTO_STASH=true
			shift
			;;
		--paths)
			PATHS="$2"
			shift 2
			;;
		--allow-unrelated-histories)
			ALLOW_UNRELATED=true
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
if [[ -f "$CONFIG_FILE" ]]; then
	UPSTREAM_BRANCH=$(grep -o '"defaultBranch"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 || echo "main")
	CONFIG_STRATEGY=$(grep -o '"strategy"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 || echo "merge")
	if [[ "$CONFIG_STRATEGY" == "rebase" && "$USE_REBASE" == "false" ]]; then
		USE_REBASE=true
	fi
fi

echo -e "${BLUE}VPK Sync Pull${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Strategy: ${GREEN}$(if $USE_REBASE; then echo 'rebase'; else echo 'merge'; fi)${NC}"
echo -e "Branch:   ${GREEN}$UPSTREAM_BRANCH${NC}"
if [[ -n "$PATHS" ]]; then
	echo -e "Paths:    ${GREEN}$PATHS${NC}"
fi
echo ""

if $DRY_RUN; then
	echo -e "${YELLOW}[DRY RUN] Would perform the following:${NC}"
	echo ""
fi

# Check for upstream remote
if ! git remote get-url upstream &>/dev/null; then
	echo -e "${RED}✗ No upstream remote configured${NC}"
	echo "Run: /vpk-sync --init"
	exit 1
fi

# Check for uncommitted changes
UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
	echo -e "${YELLOW}! Uncommitted changes detected:${NC}"
	echo "$UNCOMMITTED" | head -10
	if [[ $(echo "$UNCOMMITTED" | wc -l) -gt 10 ]]; then
		echo "  ... and more"
	fi
	echo ""

	if $AUTO_STASH; then
		if ! $DRY_RUN; then
			git stash push -m "vpk-sync: auto-stash before pull"
			echo -e "${GREEN}✓ Changes stashed${NC}"
		else
			echo -e "${YELLOW}[DRY RUN] Would stash changes${NC}"
		fi
	else
		echo -e "${RED}Cannot proceed with uncommitted changes.${NC}"
		echo "Options:"
		echo "  • Add --stash to auto-stash changes"
		echo "  • Commit changes: git add . && git commit -m 'WIP'"
		echo "  • Discard changes: git checkout ."
		exit 1
	fi
fi

# Fetch upstream
echo "Fetching upstream..."
if ! $DRY_RUN; then
	git fetch upstream
	echo -e "${GREEN}✓ Fetched upstream/$UPSTREAM_BRANCH${NC}"
else
	echo -e "${YELLOW}[DRY RUN] Would fetch upstream${NC}"
fi

# Show what would be synced
echo ""
echo -e "${BLUE}Changes from upstream:${NC}"
if ! $DRY_RUN; then
	COMMITS_BEHIND=$(git rev-list --count HEAD..upstream/$UPSTREAM_BRANCH 2>/dev/null || echo "0")
	if [[ "$COMMITS_BEHIND" == "0" ]]; then
		echo -e "${GREEN}Already up to date!${NC}"

		# Restore stash if we stashed
		if $AUTO_STASH && [[ -n "$UNCOMMITTED" ]]; then
			git stash pop
			echo -e "${GREEN}✓ Restored stashed changes${NC}"
		fi
		exit 0
	fi

	echo -e "  $COMMITS_BEHIND commit(s) to sync"
	echo ""
	git log --oneline HEAD..upstream/$UPSTREAM_BRANCH | head -10
	if [[ $COMMITS_BEHIND -gt 10 ]]; then
		echo "  ... and $(($COMMITS_BEHIND - 10)) more"
	fi
else
	echo -e "${YELLOW}[DRY RUN] Would show commits to sync${NC}"
fi

# Perform sync
echo ""
if [[ -n "$PATHS" ]]; then
	# Selective path sync using checkout
	echo "Syncing specific paths..."
	if ! $DRY_RUN; then
		for path in $PATHS; do
			if git checkout upstream/$UPSTREAM_BRANCH -- "$path" 2>/dev/null; then
				echo -e "${GREEN}✓ Synced: $path${NC}"
			else
				echo -e "${YELLOW}! Path not found in upstream: $path${NC}"
			fi
		done
		echo ""
		echo -e "${GREEN}Selective sync complete!${NC}"
		echo "Review changes with: git status"
		echo "Commit with: git add . && git commit -m 'Sync from upstream'"
	else
		echo -e "${YELLOW}[DRY RUN] Would sync paths: $PATHS${NC}"
	fi
else
	# Full sync
	if $USE_REBASE; then
		echo "Rebasing onto upstream/$UPSTREAM_BRANCH..."
		if ! $DRY_RUN; then
			if git rebase upstream/$UPSTREAM_BRANCH; then
				echo -e "${GREEN}✓ Rebase successful!${NC}"
			else
				echo ""
				echo -e "${RED}✗ Rebase conflicts detected${NC}"
				echo ""
				echo "Conflicting files:"
				git diff --name-only --diff-filter=U
				echo ""
				echo "To resolve:"
				echo "  1. Edit conflicting files (look for <<<<<<< markers)"
				echo "  2. Stage resolved files: git add <file>"
				echo "  3. Continue rebase: git rebase --continue"
				echo ""
				echo "To abort: git rebase --abort"
				exit 1
			fi
		else
			echo -e "${YELLOW}[DRY RUN] Would rebase onto upstream/$UPSTREAM_BRANCH${NC}"
		fi
	else
		echo "Merging upstream/$UPSTREAM_BRANCH..."
		if ! $DRY_RUN; then
			# Build merge command with optional --allow-unrelated-histories
			MERGE_CMD="git merge upstream/$UPSTREAM_BRANCH -m 'Merge upstream VPK updates'"
			if $ALLOW_UNRELATED; then
				MERGE_CMD="git merge upstream/$UPSTREAM_BRANCH --allow-unrelated-histories -m 'Merge upstream VPK updates'"
			fi
			
			# Attempt merge
			MERGE_OUTPUT=""
			MERGE_EXIT=0
			MERGE_OUTPUT=$(eval "$MERGE_CMD" 2>&1) || MERGE_EXIT=$?
			
			if [[ $MERGE_EXIT -eq 0 ]]; then
				echo -e "${GREEN}✓ Merge successful!${NC}"
			else
				# Check if it's an unrelated histories error
				if echo "$MERGE_OUTPUT" | grep -q "refusing to merge unrelated histories"; then
					echo ""
					echo -e "${RED}✗ Unrelated histories detected${NC}"
					echo ""
					echo "Your repo was created without preserving VPK's commit history."
					echo "This is common for projects created before vpk-share was updated."
					echo ""
					echo -e "${YELLOW}To fix this, re-run with:${NC}"
					echo "  /vpk-sync --pull --allow-unrelated-histories"
					echo ""
					echo "Or manually:"
					echo "  git merge upstream/$UPSTREAM_BRANCH --allow-unrelated-histories"
					echo ""
					echo -e "${BLUE}Note:${NC} New projects created with /vpk-share --create now preserve"
					echo "commit history, so this won't be needed for future projects."
					exit 1
				fi
				
				# Regular merge conflict
				echo ""
				echo -e "${RED}✗ Merge conflicts detected${NC}"
				echo ""
				echo "Conflicting files:"
				git diff --name-only --diff-filter=U
				echo ""
				echo "To resolve:"
				echo "  1. Edit conflicting files (look for <<<<<<< markers)"
				echo "  2. Stage resolved files: git add <file>"
				echo "  3. Complete merge: git merge --continue"
				echo ""
				echo "To abort: git merge --abort"
				exit 1
			fi
		else
			echo -e "${YELLOW}[DRY RUN] Would merge upstream/$UPSTREAM_BRANCH${NC}"
			if $ALLOW_UNRELATED; then
				echo -e "${YELLOW}[DRY RUN] Would use --allow-unrelated-histories${NC}"
			fi
		fi
	fi
fi

# Restore stash if we stashed
if $AUTO_STASH && [[ -n "$UNCOMMITTED" ]] && ! $DRY_RUN; then
	echo ""
	if git stash pop; then
		echo -e "${GREEN}✓ Restored stashed changes${NC}"
	else
		echo -e "${YELLOW}! Could not auto-restore stash (may have conflicts)${NC}"
		echo "Manually restore with: git stash pop"
	fi
fi

echo ""
echo -e "${GREEN}Pull complete!${NC}"
