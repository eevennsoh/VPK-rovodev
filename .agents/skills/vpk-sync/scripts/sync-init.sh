#!/bin/bash
#
# sync-init.sh - Initialize upstream VPK repository connection
#
# Usage: sync-init.sh [upstream-url] [options]
#   --branch NAME    Default branch (default: main)
#   --strategy STR   merge or rebase (default: merge)
#   --dry-run        Preview only
#
# Handles two scenarios:
#   1. User cloned VPK directly (origin = VPK) → renames origin to upstream
#   2. User has own repo (origin = their repo) → adds upstream remote

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_UPSTREAM="https://github.com/eevennsoh/VPK"
DEFAULT_BRANCH="main"
DEFAULT_STRATEGY="merge"
DRY_RUN=false

# Parse arguments
UPSTREAM_URL=""
BRANCH="$DEFAULT_BRANCH"
STRATEGY="$DEFAULT_STRATEGY"

while [[ $# -gt 0 ]]; do
	case $1 in
		--branch)
			BRANCH="$2"
			shift 2
			;;
		--strategy)
			STRATEGY="$2"
			shift 2
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
			if [[ -z "$UPSTREAM_URL" ]]; then
				UPSTREAM_URL="$1"
			fi
			shift
			;;
	esac
done

# Detect current remotes
CURRENT_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
CURRENT_UPSTREAM=$(git remote get-url upstream 2>/dev/null || echo "")

# Determine if origin is VPK (user cloned VPK directly)
IS_ORIGIN_VPK=false
if [[ -n "$CURRENT_ORIGIN" ]] && [[ "$CURRENT_ORIGIN" == *"VPK"* || "$CURRENT_ORIGIN" == *"vpk"* ]]; then
	IS_ORIGIN_VPK=true
fi

# Use default if no URL provided
if [[ -z "$UPSTREAM_URL" ]]; then
	if [[ "$IS_ORIGIN_VPK" == true ]]; then
		# Origin is VPK, use it as upstream
		UPSTREAM_URL="$CURRENT_ORIGIN"
	else
		UPSTREAM_URL="$DEFAULT_UPSTREAM"
	fi
fi

# Validate strategy
if [[ "$STRATEGY" != "merge" && "$STRATEGY" != "rebase" ]]; then
	echo -e "${RED}Invalid strategy: $STRATEGY (must be 'merge' or 'rebase')${NC}"
	exit 1
fi

echo -e "${BLUE}VPK Sync Init${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Upstream URL:  ${GREEN}$UPSTREAM_URL${NC}"
echo -e "Branch:        ${GREEN}$BRANCH${NC}"
echo -e "Strategy:      ${GREEN}$STRATEGY${NC}"
if [[ "$IS_ORIGIN_VPK" == true ]]; then
	echo -e "Mode:          ${YELLOW}Direct clone (origin → upstream)${NC}"
else
	echo -e "Mode:          ${GREEN}Separate repo (adding upstream)${NC}"
fi
echo ""

if $DRY_RUN; then
	echo -e "${YELLOW}[DRY RUN] Would perform the following:${NC}"
	echo ""
fi

# Handle scenario: origin is VPK (user cloned VPK directly without creating new repo)
if [[ "$IS_ORIGIN_VPK" == true ]] && [[ -z "$CURRENT_UPSTREAM" ]]; then
	echo -e "${YELLOW}Detected: You cloned VPK directly (origin points to VPK)${NC}"
	echo -e "Renaming 'origin' → 'upstream' for sync workflow..."
	echo ""
	
	if ! $DRY_RUN; then
		git remote rename origin upstream
		echo -e "${GREEN}✓ Renamed origin to upstream${NC}"
		echo -e "${YELLOW}Note: You no longer have an 'origin' remote.${NC}"
		echo -e "${YELLOW}      Use /vpk-share --create to create your own repo, or${NC}"
		echo -e "${YELLOW}      push via fork with /vpk-sync --push --use-fork${NC}"
	else
		echo -e "${YELLOW}[DRY RUN] Would rename origin to upstream${NC}"
	fi
else
	# Standard case: add or update upstream remote
	if [[ -n "$CURRENT_UPSTREAM" ]]; then
		if [[ "$CURRENT_UPSTREAM" == "$UPSTREAM_URL" ]]; then
			echo -e "${GREEN}✓ Upstream remote already configured correctly${NC}"
		else
			echo -e "${YELLOW}! Upstream remote exists with different URL${NC}"
			echo -e "  Current: $CURRENT_UPSTREAM"
			echo -e "  New:     $UPSTREAM_URL"
			if ! $DRY_RUN; then
				git remote set-url upstream "$UPSTREAM_URL"
				echo -e "${GREEN}✓ Updated upstream remote URL${NC}"
			else
				echo -e "${YELLOW}[DRY RUN] Would update upstream remote URL${NC}"
			fi
		fi
	else
		if ! $DRY_RUN; then
			git remote add upstream "$UPSTREAM_URL"
			echo -e "${GREEN}✓ Added upstream remote${NC}"
		else
			echo -e "${YELLOW}[DRY RUN] Would add upstream remote${NC}"
		fi
	fi
fi

# Create/update .vpk-sync.json config
CONFIG_FILE=".vpk-sync.json"
CONFIG_CONTENT=$(cat <<EOF
{
  "upstream": {
    "url": "$UPSTREAM_URL",
    "defaultBranch": "$BRANCH"
  },
  "sync": {
    "strategy": "$STRATEGY",
    "excludePaths": []
  },
  "push": {
    "useFork": false,
    "forkRemote": "origin"
  }
}
EOF
)

if ! $DRY_RUN; then
	echo "$CONFIG_CONTENT" > "$CONFIG_FILE"
	echo -e "${GREEN}✓ Created $CONFIG_FILE${NC}"
else
	echo -e "${YELLOW}[DRY RUN] Would create $CONFIG_FILE with:${NC}"
	echo "$CONFIG_CONTENT"
fi

# Fetch upstream to verify connection
echo ""
if ! $DRY_RUN; then
	echo "Fetching upstream to verify connection..."
	if git fetch upstream 2>/dev/null; then
		echo -e "${GREEN}✓ Successfully connected to upstream${NC}"

		# Show current status
		LOCAL_BRANCH=$(git branch --show-current)
		BEHIND=$(git rev-list --count HEAD..upstream/$BRANCH 2>/dev/null || echo "0")
		AHEAD=$(git rev-list --count upstream/$BRANCH..HEAD 2>/dev/null || echo "0")

		echo ""
		echo -e "${BLUE}Status:${NC}"
		echo -e "  Local branch:  $LOCAL_BRANCH"
		echo -e "  Commits ahead: $AHEAD"
		echo -e "  Commits behind: $BEHIND"
	else
		echo -e "${RED}✗ Failed to fetch upstream - check URL and access${NC}"
		exit 1
	fi
else
	echo -e "${YELLOW}[DRY RUN] Would fetch upstream to verify connection${NC}"
fi

echo ""
echo -e "${GREEN}Init complete!${NC}"
echo ""
echo "Next steps:"
echo "  • Pull updates:  /vpk-sync --pull"
echo "  • Push changes:  /vpk-sync --push"
