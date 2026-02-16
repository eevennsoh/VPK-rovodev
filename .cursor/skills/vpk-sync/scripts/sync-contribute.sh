#!/bin/bash
#
# sync-contribute.sh - Feature-branch contribution workflow for VPK
#
# Usage: sync-contribute.sh [options] [branch-name]
#   --list              List branches available for contribution
#   --commits "1,2,4"   Specify commits to include (by number from list)
#   --exclude "3,5"     Specify commits to exclude (by number from list)
#   --all               Include all commits (skip selection)
#   --dry-run           Preview only, don't make changes
#   --pr-title "..."    Custom PR title
#   --pr-body "..."     Custom PR body
#
# Tracking:
#   Contributed commits are tracked via git tags: vpk-contributed/<commit-sha>
#   Query contributed commits: git tag -l "vpk-contributed/*"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
LIST_ONLY=false
BRANCH_NAME=""
INCLUDE_COMMITS=""
EXCLUDE_COMMITS=""
ALL_COMMITS=false
DRY_RUN=false
PR_TITLE=""
PR_BODY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--list)
			LIST_ONLY=true
			shift
			;;
		--commits)
			INCLUDE_COMMITS="$2"
			shift 2
			;;
		--exclude)
			EXCLUDE_COMMITS="$2"
			shift 2
			;;
		--all)
			ALL_COMMITS=true
			shift
			;;
		--dry-run)
			DRY_RUN=true
			shift
			;;
		--pr-title)
			PR_TITLE="$2"
			shift 2
			;;
		--pr-body)
			PR_BODY="$2"
			shift 2
			;;
		-*)
			echo -e "${RED}Unknown option: $1${NC}"
			echo "Usage: sync-contribute.sh [options] [branch-name]"
			echo "  --list              List branches available for contribution"
			echo "  --commits \"1,2,4\"   Specify commits to include (by number)"
			echo "  --exclude \"3,5\"     Specify commits to exclude (by number)"
			echo "  --all               Include all commits"
			echo "  --dry-run           Preview only"
			exit 1
			;;
		*)
			BRANCH_NAME="$1"
			shift
			;;
	esac
done

echo -e "${BLUE}${BOLD}VPK Contribute${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for upstream remote
UPSTREAM_URL=$(git remote get-url upstream 2>/dev/null || echo "")
if [[ -z "$UPSTREAM_URL" ]]; then
	echo -e "${RED}✗ No upstream remote configured${NC}"
	echo "Run: /vpk-sync --init"
	exit 1
fi

# Extract upstream repo for PR creation
UPSTREAM_REPO=$(echo "$UPSTREAM_URL" | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')
echo -e "Upstream: ${GREEN}$UPSTREAM_REPO${NC}"

# Fetch upstream to ensure we have latest
echo -e "${YELLOW}Fetching upstream...${NC}"
git fetch upstream --quiet 2>/dev/null || git fetch upstream

# Get upstream default branch
UPSTREAM_BRANCH="main"

# Function to check if a commit was already contributed
is_contributed() {
	local sha="$1"
	git tag -l "vpk-contributed/$sha" | grep -q "vpk-contributed/$sha"
}

# Function to get contribution info for a commit
get_contribution_info() {
	local sha="$1"
	local tag_message=$(git tag -l -n1 "vpk-contributed/$sha" 2>/dev/null | sed "s/vpk-contributed\/$sha//")
	echo "$tag_message"
}

# Function to list feature branches available for contribution
list_feature_branches() {
	echo -e "${BLUE}Feature branches available for contribution:${NC}"
	echo ""

	local branch_num=0
	local found_branches=false

	# Get all local branches except main
	for branch in $(git branch --format='%(refname:short)' | grep -v '^main$' | grep -v '^vpk-contribute/'); do
		# Skip if branch is behind or equal to upstream/main (nothing to contribute)
		local ahead_count=$(git rev-list --count upstream/$UPSTREAM_BRANCH..$branch 2>/dev/null || echo "0")

		if [[ "$ahead_count" -gt 0 ]]; then
			branch_num=$((branch_num + 1))
			found_branches=true

			# Check contribution status of commits on this branch
			local total_commits=$ahead_count
			local contributed_count=0

			for sha in $(git rev-list upstream/$UPSTREAM_BRANCH..$branch 2>/dev/null); do
				if is_contributed "$sha"; then
					contributed_count=$((contributed_count + 1))
				fi
			done

			local uncontributed=$((total_commits - contributed_count))

			# Format status
			local status_text=""
			if [[ $contributed_count -eq 0 ]]; then
				status_text="${YELLOW}not contributed${NC}"
			elif [[ $contributed_count -eq $total_commits ]]; then
				status_text="${GREEN}fully contributed${NC}"
			else
				status_text="${CYAN}$contributed_count/$total_commits contributed${NC}"
			fi

			printf "  ${BOLD}%2d.${NC} %-40s ${CYAN}%d commits ahead${NC}, %b\n" \
				"$branch_num" "$branch" "$ahead_count" "$status_text"
		fi
	done

	if ! $found_branches; then
		echo -e "  ${YELLOW}No feature branches with uncontributed commits found${NC}"
		echo ""
		echo "  Feature branches should:"
		echo "  - Have commits ahead of upstream/main"
		echo "  - Not be named 'main' or start with 'vpk-contribute/'"
	fi

	echo ""
}

# List mode
if $LIST_ONLY; then
	list_feature_branches
	exit 0
fi

# If no branch specified, show list and exit with guidance
if [[ -z "$BRANCH_NAME" ]]; then
	list_feature_branches
	echo -e "${YELLOW}Specify a branch to contribute:${NC}"
	echo "  sync-contribute.sh <branch-name>"
	echo ""
	echo "Or use the agent's interactive mode via /vpk-sync --contribute"
	exit 0
fi

# Verify branch exists
if ! git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
	echo -e "${RED}✗ Branch '$BRANCH_NAME' not found${NC}"
	echo ""
	echo "Available branches:"
	git branch --format='%(refname:short)' | grep -v '^main$' | sed 's/^/  /'
	exit 1
fi

echo -e "Branch:   ${GREEN}$BRANCH_NAME${NC}"
echo ""

# Get commits on the branch that are ahead of upstream
COMMITS=()
COMMIT_SHAS=()
COMMIT_MESSAGES=()
COMMIT_STATUS=()

echo -e "${BLUE}Commits on $BRANCH_NAME:${NC}"
echo ""

commit_num=0
while IFS= read -r line; do
	sha=$(echo "$line" | cut -d' ' -f1)
	message=$(echo "$line" | cut -d' ' -f2-)
	commit_num=$((commit_num + 1))

	COMMITS+=("$line")
	COMMIT_SHAS+=("$sha")
	COMMIT_MESSAGES+=("$message")

	# Check if already contributed
	if is_contributed "$sha"; then
		COMMIT_STATUS+=("contributed")
		status_marker="${GREEN}[contributed]${NC}"
	else
		COMMIT_STATUS+=("pending")
		status_marker="${YELLOW}[pending]${NC}"
	fi

	printf "  ${BOLD}%2d.${NC} %s - %s %b\n" "$commit_num" "$sha" "$message" "$status_marker"
done < <(git log --oneline upstream/$UPSTREAM_BRANCH..$BRANCH_NAME --reverse)

if [[ ${#COMMITS[@]} -eq 0 ]]; then
	echo -e "  ${YELLOW}No commits ahead of upstream/$UPSTREAM_BRANCH${NC}"
	exit 0
fi

echo ""

# Determine which commits to include
SELECTED_INDICES=()

if $ALL_COMMITS; then
	# Include all commits
	for i in "${!COMMITS[@]}"; do
		SELECTED_INDICES+=($i)
	done
	echo -e "${CYAN}Including all ${#COMMITS[@]} commits${NC}"
elif [[ -n "$INCLUDE_COMMITS" ]]; then
	# Parse comma-separated commit numbers
	IFS=',' read -ra nums <<< "$INCLUDE_COMMITS"
	for num in "${nums[@]}"; do
		num=$(echo "$num" | tr -d ' ')
		if [[ "$num" =~ ^[0-9]+$ ]] && [[ $num -ge 1 ]] && [[ $num -le ${#COMMITS[@]} ]]; then
			SELECTED_INDICES+=($((num - 1)))
		fi
	done
	echo -e "${CYAN}Including specified commits: $INCLUDE_COMMITS${NC}"
elif [[ -n "$EXCLUDE_COMMITS" ]]; then
	# Start with all, remove excluded
	for i in "${!COMMITS[@]}"; do
		SELECTED_INDICES+=($i)
	done

	IFS=',' read -ra nums <<< "$EXCLUDE_COMMITS"
	for num in "${nums[@]}"; do
		num=$(echo "$num" | tr -d ' ')
		if [[ "$num" =~ ^[0-9]+$ ]] && [[ $num -ge 1 ]] && [[ $num -le ${#COMMITS[@]} ]]; then
			# Remove from array
			idx=$((num - 1))
			SELECTED_INDICES=("${SELECTED_INDICES[@]/$idx}")
		fi
	done
	# Clean up array (remove empty elements)
	SELECTED_INDICES=(${SELECTED_INDICES[@]})
	echo -e "${CYAN}Excluding commits: $EXCLUDE_COMMITS${NC}"
else
	# Default: include all pending (non-contributed) commits
	for i in "${!COMMITS[@]}"; do
		if [[ "${COMMIT_STATUS[$i]}" == "pending" ]]; then
			SELECTED_INDICES+=($i)
		fi
	done

	if [[ ${#SELECTED_INDICES[@]} -eq 0 ]]; then
		echo -e "${GREEN}All commits have already been contributed!${NC}"
		echo ""
		echo "Use --all to re-contribute, or --commits to select specific commits."
		exit 0
	fi

	echo -e "${CYAN}Including ${#SELECTED_INDICES[@]} pending commits (already contributed commits excluded)${NC}"
fi

if [[ ${#SELECTED_INDICES[@]} -eq 0 ]]; then
	echo -e "${YELLOW}No commits selected for contribution${NC}"
	exit 0
fi

echo ""
echo -e "${BLUE}Commits to contribute:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
	printf "  • %s - %s\n" "${COMMIT_SHAS[$idx]}" "${COMMIT_MESSAGES[$idx]}"
done
echo ""

# Check GitHub CLI
if ! gh auth status &>/dev/null; then
	echo -e "${RED}✗ GitHub CLI not authenticated${NC}"
	echo "Run: gh auth login"
	exit 1
fi
echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"

# Generate branch name for contribution
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CONTRIB_BRANCH="vpk-contribute/${BRANCH_NAME//\//-}-$TIMESTAMP"

# Generate PR title if not provided
if [[ -z "$PR_TITLE" ]]; then
	# Use the first commit message as base, or branch name
	if [[ ${#SELECTED_INDICES[@]} -eq 1 ]]; then
		PR_TITLE="${COMMIT_MESSAGES[${SELECTED_INDICES[0]}]}"
	else
		# Clean up branch name for title
		PR_TITLE="Contribute: ${BRANCH_NAME//\// }"
	fi
fi

# Generate PR body if not provided
if [[ -z "$PR_BODY" ]]; then
	PR_BODY="## Summary

Contribution from feature branch \`$BRANCH_NAME\`.

## Commits

"
	for idx in "${SELECTED_INDICES[@]}"; do
		PR_BODY+="- ${COMMIT_SHAS[$idx]} - ${COMMIT_MESSAGES[$idx]}
"
	done

	PR_BODY+="
---

🤖 Created with [VPK Sync](https://github.com/eevennsoh/VPK) \`--contribute\`"
fi

echo ""
echo -e "${BLUE}PR Details:${NC}"
echo -e "  Branch: $CONTRIB_BRANCH"
echo -e "  Title:  $PR_TITLE"
echo ""

if $DRY_RUN; then
	echo -e "${YELLOW}[DRY RUN] Would perform the following:${NC}"
	echo "  1. Create branch: $CONTRIB_BRANCH from upstream/$UPSTREAM_BRANCH"
	echo "  2. Cherry-pick ${#SELECTED_INDICES[@]} commits"
	echo "  3. Push to origin"
	echo "  4. Create PR to $UPSTREAM_REPO"
	echo "  5. Tag contributed commits"
	exit 0
fi

# Save current branch
ORIGINAL_BRANCH=$(git branch --show-current)

# Create contribution branch from upstream/main
echo -e "${YELLOW}Creating contribution branch from upstream/$UPSTREAM_BRANCH...${NC}"
git checkout -b "$CONTRIB_BRANCH" "upstream/$UPSTREAM_BRANCH"

# Cherry-pick selected commits
echo -e "${YELLOW}Cherry-picking commits...${NC}"
CHERRY_PICK_FAILED=false
CONTRIBUTED_SHAS=()

for idx in "${SELECTED_INDICES[@]}"; do
	sha="${COMMIT_SHAS[$idx]}"
	msg="${COMMIT_MESSAGES[$idx]}"

	echo -e "  ${BLUE}Cherry-picking: $sha - $msg${NC}"

	if ! git cherry-pick "$sha" --no-edit 2>/dev/null; then
		echo ""
		echo -e "${RED}✗ Cherry-pick failed for $sha${NC}"
		echo ""
		echo -e "${YELLOW}Conflicts in:${NC}"
		git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/  /'
		echo ""
		echo -e "${YELLOW}To resolve:${NC}"
		echo "  1. Fix conflicts in the listed files"
		echo "  2. Stage resolved files: git add <file>"
		echo "  3. Continue: git cherry-pick --continue"
		echo ""
		echo -e "${YELLOW}Then complete the contribution:${NC}"
		echo "  git push -u origin $CONTRIB_BRANCH"
		echo "  gh pr create --repo $UPSTREAM_REPO --base $UPSTREAM_BRANCH --title \"$PR_TITLE\""
		echo ""
		echo -e "${YELLOW}Or abort:${NC}"
		echo "  git cherry-pick --abort"
		echo "  git checkout $ORIGINAL_BRANCH"
		echo "  git branch -D $CONTRIB_BRANCH"
		CHERRY_PICK_FAILED=true
		break
	fi

	CONTRIBUTED_SHAS+=("$sha")
done

if $CHERRY_PICK_FAILED; then
	exit 1
fi

echo -e "${GREEN}✓ All commits cherry-picked successfully${NC}"
echo ""

# Push the branch
echo -e "${YELLOW}Pushing to origin...${NC}"
if ! git push -u origin "$CONTRIB_BRANCH" 2>/dev/null; then
	echo -e "${RED}✗ Failed to push to origin${NC}"
	echo ""
	echo "You may need to push manually:"
	echo "  git push -u origin $CONTRIB_BRANCH"
	exit 1
fi
echo -e "${GREEN}✓ Pushed to origin/$CONTRIB_BRANCH${NC}"
echo ""

# Create PR
echo -e "${YELLOW}Creating pull request...${NC}"

# Get origin owner for cross-fork PR
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
ORIGIN_OWNER=$(echo "$ORIGIN_URL" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
HEAD_REF="$ORIGIN_OWNER:$CONTRIB_BRANCH"

PR_URL=$(gh pr create \
	--repo "$UPSTREAM_REPO" \
	--head "$HEAD_REF" \
	--base "$UPSTREAM_BRANCH" \
	--title "$PR_TITLE" \
	--body "$PR_BODY" \
	2>&1) || true

if [[ "$PR_URL" == http* ]]; then
	echo -e "${GREEN}✓ Pull request created!${NC}"
	echo ""
	echo -e "  ${BLUE}$PR_URL${NC}"

	# Extract PR number for tagging
	PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$' || echo "unknown")
else
	echo -e "${YELLOW}! Could not create PR automatically${NC}"
	echo "  $PR_URL"
	echo ""
	echo "Create manually at: https://github.com/$UPSTREAM_REPO/compare/$UPSTREAM_BRANCH...$ORIGIN_OWNER:$CONTRIB_BRANCH"
	PR_NUMBER="manual"
fi

echo ""

# Tag contributed commits
echo -e "${YELLOW}Tagging contributed commits...${NC}"
CURRENT_DATE=$(date +%Y-%m-%d)

for sha in "${CONTRIBUTED_SHAS[@]}"; do
	tag_name="vpk-contributed/$sha"
	tag_message="PR #$PR_NUMBER on $CURRENT_DATE from $BRANCH_NAME"

	# Create the tag
	git tag -a "$tag_name" -m "$tag_message" "$sha" 2>/dev/null || {
		echo -e "  ${YELLOW}Tag already exists: $tag_name${NC}"
		continue
	}
	echo -e "  ${GREEN}✓ Tagged: $sha${NC}"
done

# Push tags
echo -e "${YELLOW}Pushing tags...${NC}"
git push origin --tags 2>/dev/null || echo -e "${YELLOW}! Could not push tags (may need manual push)${NC}"

echo ""

# Return to original branch
echo -e "${YELLOW}Returning to $ORIGINAL_BRANCH...${NC}"
git checkout "$ORIGINAL_BRANCH"

echo ""
echo -e "${GREEN}${BOLD}Contribution complete!${NC}"
echo ""
echo "Summary:"
echo "  • Contributed ${#CONTRIBUTED_SHAS[@]} commits from $BRANCH_NAME"
echo "  • PR branch: $CONTRIB_BRANCH"
if [[ "$PR_URL" == http* ]]; then
	echo "  • PR URL: $PR_URL"
fi
echo ""
echo "The contribution branch ($CONTRIB_BRANCH) remains for reference."
echo "Delete it after PR is merged: git branch -D $CONTRIB_BRANCH"
