#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# build_vpk_boilerplate.sh
# Create and share VPK projects
#
# Modes:
#   --create NAME    Create new GitHub repo (with optional upstream sync)
#   --export         Export sanitized boilerplate (no GitHub repo)
#   --reset          Reset current project in-place
# =============================================================================

show_help() {
	cat <<'USAGE'
Usage: build_vpk_boilerplate.sh <mode> [options]

Modes:
	--create NAME    Create new project with GitHub repo
	--export         Export sanitized boilerplate (no GitHub repo)
	--reset          Reset current project in-place (comprehensive cleanup)

Create mode options:
	--public         Make GitHub repo public (default: private)
	--no-upstream    Skip upstream configuration (standalone project)

Export mode options:
	--src PATH       Source VPK repo path (default: current directory)
	--dest PATH      Destination export path (default: <src>-boilerplate)

Common options:
	--force          Remove destination if it already exists
	--dry-run        Print actions without executing
	-h, --help       Show this help

Examples:
	# Create new project with VPK sync (can contribute back)
	build_vpk_boilerplate.sh --create my-app

	# Create standalone project (no VPK connection)
	build_vpk_boilerplate.sh --create my-app --no-upstream

	# Export sanitized boilerplate for manual distribution
	build_vpk_boilerplate.sh --export --dest ../my-boilerplate

	# Reset current project (comprehensive cleanup)
	build_vpk_boilerplate.sh --reset

Reset mode removes:
	- .deploy.local, .env.local, .env, .asap-config (credentials)
	- .dev-pids, .dev-backend-port (dev server state)
	- *.local.md, *.local.json (local config files)
	- node_modules/, .next/, out/, build/, .turbo/ (build artifacts)
USAGE
}

# Default values
src="$(pwd)"
dest=""
force=false
dry_run=false
mode=""
project_name=""
visibility="private"
configure_upstream=true

# Parse arguments
while [[ $# -gt 0 ]]; do
	case "$1" in
		--create)
			mode="create"
			if [[ $# -gt 1 && ! "$2" =~ ^-- ]]; then
				project_name="$2"
				shift
			fi
			shift
			;;
		--export)
			mode="export"
			shift
			;;
		--reset)
			mode="reset"
			shift
			;;
		--src)
			src="$2"
			shift 2
			;;
		--dest)
			dest="$2"
			shift 2
			;;
		--public)
			visibility="public"
			shift
			;;
		--no-upstream)
			configure_upstream=false
			shift
			;;
		--force)
			force=true
			shift
			;;
		--dry-run)
			dry_run=true
			shift
			;;
		-h|--help)
			show_help
			exit 0
			;;
		*)
			echo "Unknown argument: $1" >&2
			show_help >&2
			exit 1
			;;
	esac
done

# Resolve source path
src="$(cd "$src" && pwd)"

# Files to remove in reset mode or from destination after export
local_files=(
	".deploy.local"
	".env.local"
	".env"
	".asap-config"
	".dev-pids"
	".dev-backend-port"
	".api-routes-backup"
	".vpk-sync.json"
)

# Directories to remove in reset mode (build artifacts, dependencies)
build_dirs=(
	"node_modules"
	"backend/node_modules"
	".next"
	"out"
	"build"
	".turbo"
	".cache"
	"coverage"
	".vercel"
	".pnpm-store"
)

# Excludes for rsync (export and create modes)
excludes=(
	".git/"
	"node_modules/"
	"backend/node_modules/"
	".next/"
	"out/"
	"build/"
	"coverage/"
	".pnpm-store/"
	".pnp"
	".pnp.*"
	".yarn/"
	".vercel/"
	".turbo/"
	".cache/"
	"dist/"
	"tmp/"
	".tmp/"
	".DS_Store"
	"*.log"
	"npm-debug.log*"
	"yarn-debug.log*"
	".pnpm-debug.log*"
	".env*"
	".asap-config"
	"*.pem"
	"*.key"
	"*.p12"
	"*.pfx"
	"*.jks"
	"*.tsbuildinfo"
	"next-env.d.ts"
	".dev-pids"
	".dev-backend-port"
	".api-routes-backup"
	".idea/"
	".vscode/"
	"*.local.md"
	"*.local.json"
	".vpk-sync.json"
)

# =============================================================================
# RESET MODE
# =============================================================================
do_reset() {
	echo "=== VPK Reset ==="
	echo ""
	echo "Resetting repo to clean state: $src"
	echo ""
	
	removed_files=0
	removed_dirs=0
	
	# Remove credential/local files
	for file in "${local_files[@]}"; do
		if [[ -e "$src/$file" ]]; then
			if [[ "$dry_run" == true ]]; then
				echo "[dry-run] Would remove file: $file"
			else
				rm -f "$src/$file"
				echo "✓ Removed file: $file"
			fi
			((removed_files++)) || true
		fi
	done
	
	# Remove *.local.md and *.local.json files
	while IFS= read -r -d '' file; do
		if [[ "$dry_run" == true ]]; then
			echo "[dry-run] Would remove file: ${file#$src/}"
		else
			rm -f "$file"
			echo "✓ Removed file: ${file#$src/}"
		fi
		((removed_files++)) || true
	done < <(find "$src" -maxdepth 3 \( -name "*.local.md" -o -name "*.local.json" \) -print0 2>/dev/null)
	
	# Remove build artifact directories
	for dir in "${build_dirs[@]}"; do
		if [[ -d "$src/$dir" ]]; then
			if [[ "$dry_run" == true ]]; then
				echo "[dry-run] Would remove directory: $dir/"
			else
				rm -rf "$src/$dir"
				echo "✓ Removed directory: $dir/"
			fi
			((removed_dirs++)) || true
		fi
	done
	
	# Summary
	echo ""
	if [[ $removed_files -eq 0 && $removed_dirs -eq 0 ]]; then
		echo "No files or directories to remove. Repo is already clean."
	else
		echo "Reset complete:"
		[[ $removed_files -gt 0 ]] && echo "  - Removed $removed_files file(s)"
		[[ $removed_dirs -gt 0 ]] && echo "  - Removed $removed_dirs directory(ies)"
		echo ""
		echo "Run 'pnpm install' to reinstall dependencies."
	fi
	
	# Verify service-descriptor.yml has placeholders
	if [[ -f "$src/service-descriptor.yml" ]]; then
		echo ""
		if grep -q "YOUR-SERVICE-NAME" "$src/service-descriptor.yml"; then
			echo "✓ service-descriptor.yml uses placeholders"
		else
			echo "⚠ WARNING: service-descriptor.yml may contain a real service name"
			echo "  Consider resetting it to use 'YOUR-SERVICE-NAME' placeholder"
		fi
	fi
}

# =============================================================================
# EXPORT MODE
# =============================================================================
do_export() {
	echo "=== VPK Export ==="
	echo ""
	
	# Requires rsync
	if ! command -v rsync >/dev/null 2>&1; then
		echo "Error: rsync is required but not found on PATH." >&2
		exit 1
	fi
	
	# Set default destination
	if [[ -z "$dest" ]]; then
		src_name="$(basename "$src")"
		dest="$(dirname "$src")/${src_name}-boilerplate"
	fi
	
	echo "Source:      $src"
	echo "Destination: $dest"
	echo ""
	
	# Handle existing destination
	if [[ -d "$dest" ]]; then
		mkdir -p "$dest"
		dest="$(cd "$dest" && pwd)"
	else
		mkdir -p "$dest"
		dest="$(cd "$dest" && pwd)"
	fi
	
	if [[ -e "$dest" && -n "$(ls -A "$dest" 2>/dev/null)" ]]; then
		if [[ "$force" == true ]]; then
			if [[ "$dry_run" == true ]]; then
				echo "[dry-run] Would remove existing destination"
			else
				rm -rf "$dest"
				mkdir -p "$dest"
			fi
		else
			echo "Error: Destination exists and is not empty: $dest" >&2
			echo "Re-run with --force to replace it." >&2
			exit 1
		fi
	fi
	
	# Build rsync command
	rsync_cmd=(rsync -a --delete)
	for ex in "${excludes[@]}"; do
		rsync_cmd+=(--exclude "$ex")
	done
	if [[ "$dry_run" == true ]]; then
		rsync_cmd+=(--dry-run -v)
	fi
	rsync_cmd+=("$src/" "$dest/")
	
	echo "Copying files..."
	"${rsync_cmd[@]}"
	
	# Re-include .env.local.example if it exists
	if [[ -f "$src/.env.local.example" ]]; then
		cp -f "$src/.env.local.example" "$dest/.env.local.example"
	fi
	
	# Remove any local/credential files that may have been copied
	for file in "${local_files[@]}"; do
		if [[ -e "$dest/$file" ]]; then
			rm -f "$dest/$file"
			echo "Cleaned: $file"
		fi
	done
	
	# Remove *.local.md and *.local.json from destination
	find "$dest" -maxdepth 3 \( -name "*.local.md" -o -name "*.local.json" \) -exec rm -f {} + 2>/dev/null || true
	
	# Remove any .env* files except .env.local.example
	find "$dest" -maxdepth 2 -name ".env*" ! -name ".env.local.example" -exec rm -f {} + 2>/dev/null || true
	
	# Verify no sensitive files remain
	sensitive_matches="$(find "$dest" -maxdepth 4 \( -name ".env*" ! -name ".env.local.example" -o -name ".asap-config" -o -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "*.pfx" -o -name "*.jks" \) 2>/dev/null || true)"
	if [[ -n "$sensitive_matches" ]]; then
		echo "Error: Sensitive files still present in export:" >&2
		echo "$sensitive_matches" >&2
		exit 2
	fi
	
	# Initialize fresh git repo without remote origin
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would initialize fresh git repo (no remote origin)"
	else
		cd "$dest"
		git init -q
		git add -A
		git commit -q -m "VPK boilerplate export"
		echo ""
		echo "✓ Initialized fresh git repo (no remote origin)"
	fi
	
	echo ""
	echo "=== Export Complete ==="
	echo ""
	echo "Boilerplate created at: $dest"
	echo ""
	echo "Next steps:"
	echo "  1. cd $dest"
	echo "  2. pnpm install"
	echo "  3. git remote add origin <your-new-repo-url>"
	echo "  4. git push -u origin main"
}

# =============================================================================
# CREATE MODE
# =============================================================================
do_create() {
	echo "=== VPK Create ==="
	echo ""
	
	# Validate project name
	if [[ -z "$project_name" ]]; then
		echo "Error: Project name is required for --create mode" >&2
		echo "Usage: build_vpk_boilerplate.sh --create <project-name>" >&2
		exit 1
	fi
	
	# Validate project name format (lowercase, hyphens, no spaces)
	if [[ ! "$project_name" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$ ]]; then
		echo "Error: Project name must be lowercase with hyphens only (e.g., my-project)" >&2
		exit 1
	fi
	
	# Check prerequisites
	if ! command -v gh >/dev/null 2>&1; then
		echo "Error: GitHub CLI (gh) is not installed" >&2
		echo "Install it from: https://cli.github.com/" >&2
		exit 1
	fi
	
	if ! gh auth status >/dev/null 2>&1; then
		echo "Error: GitHub CLI is not authenticated" >&2
		echo "Run: gh auth login" >&2
		exit 1
	fi
	
	# rsync only required for standalone mode (--no-upstream)
	if [[ "$configure_upstream" == false ]]; then
		if ! command -v rsync >/dev/null 2>&1; then
			echo "Error: rsync is not installed" >&2
			exit 1
		fi
	fi
	
	# Get GitHub username for URL display
	gh_user=$(gh api user --jq '.login' 2>/dev/null || echo "")
	
	# Calculate paths
	parent_dir="$(dirname "$src")"
	target_dir="$parent_dir/$project_name"
	
	# Capture VPK origin URL BEFORE any changes (for upstream configuration)
	vpk_upstream_url=""
	if [[ "$configure_upstream" == true ]]; then
		vpk_upstream_url=$(git remote get-url origin 2>/dev/null || echo "")
		if [[ -z "$vpk_upstream_url" ]]; then
			echo "Warning: No origin remote found. Upstream sync will not be configured." >&2
			configure_upstream=false
		fi
	fi
	
	echo "Project name: $project_name"
	echo "Visibility:   $visibility"
	[[ -n "$gh_user" ]] && echo "Owner:        $gh_user"
	if [[ "$configure_upstream" == true ]]; then
		echo "Upstream:     $vpk_upstream_url"
		echo "History:      Preserved (can sync with upstream)"
	else
		echo "Upstream:     (disabled - standalone project)"
		echo "History:      Fresh (clean slate)"
	fi
	echo ""
	echo "Source:       $src"
	echo "Target:       $target_dir"
	echo ""
	
	# Check if target already exists
	if [[ -d "$target_dir" ]]; then
		if [[ "$force" == true ]]; then
			if [[ "$dry_run" == true ]]; then
				echo "[dry-run] Would remove existing target directory"
			else
				rm -rf "$target_dir"
			fi
		else
			echo "Error: Target directory already exists: $target_dir" >&2
			echo "Re-run with --force to replace it." >&2
			exit 1
		fi
	fi
	
	# Branch based on upstream configuration
	if [[ "$configure_upstream" == true ]]; then
		# =====================================================================
		# WITH UPSTREAM: Clone to preserve history for clean sync
		# =====================================================================
		do_create_with_upstream
	else
		# =====================================================================
		# STANDALONE: rsync + git init for clean slate
		# =====================================================================
		do_create_standalone
	fi
}

# -----------------------------------------------------------------------------
# Create with upstream (preserves commit history for clean sync)
# -----------------------------------------------------------------------------
do_create_with_upstream() {
	# Step 1: Clone VPK repository
	echo "--- Step 1: Clone VPK repository ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would clone: $vpk_upstream_url"
		echo "[dry-run] Would clone to: $target_dir"
	else
		git clone --single-branch --branch main "$vpk_upstream_url" "$target_dir"
		echo "✓ Cloned VPK repository"
	fi
	echo ""
	
	# Step 2: Configure remotes (rename origin to upstream)
	echo "--- Step 2: Configure remotes ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would rename origin to upstream"
	else
		cd "$target_dir"
		git remote rename origin upstream
		echo "✓ Renamed origin → upstream"
	fi
	echo ""
	
	# Step 3: Clean sensitive files
	echo "--- Step 3: Clean sensitive files ---"
	echo ""
	
	cleaned_count=0
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would clean sensitive files"
	else
		cd "$target_dir"
		
		# Remove credential/local files
		for file in "${local_files[@]}"; do
			if [[ -e "$file" ]]; then
				rm -f "$file"
				echo "✓ Removed: $file"
				((cleaned_count++)) || true
			fi
		done
		
		# Remove .env* files except .env.local.example
		while IFS= read -r -d '' file; do
			rm -f "$file"
			echo "✓ Removed: ${file#./}"
			((cleaned_count++)) || true
		done < <(find . -maxdepth 2 -name ".env*" ! -name ".env.local.example" -print0 2>/dev/null)
		
		# Remove *.local.md and *.local.json files
		while IFS= read -r -d '' file; do
			rm -f "$file"
			echo "✓ Removed: ${file#./}"
			((cleaned_count++)) || true
		done < <(find . -maxdepth 3 \( -name "*.local.md" -o -name "*.local.json" \) -print0 2>/dev/null)
		
		# Remove build artifacts if they exist
		for dir in "${build_dirs[@]}"; do
			if [[ -d "$dir" ]]; then
				rm -rf "$dir"
				echo "✓ Removed: $dir/"
				((cleaned_count++)) || true
			fi
		done
		
		if [[ $cleaned_count -eq 0 ]]; then
			echo "✓ No sensitive files to clean"
		fi
	fi
	echo ""
	
	# Step 4: Commit the cleanup (creates divergence point from upstream)
	echo "--- Step 4: Commit project initialization ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would commit: 'Initialize project from VPK boilerplate'"
	else
		cd "$target_dir"
		git add -A
		# Only commit if there are changes
		if ! git diff --cached --quiet; then
			git commit -q -m "Initialize project from VPK boilerplate"
			echo "✓ Committed initialization"
		else
			echo "✓ No changes to commit (already clean)"
		fi
	fi
	echo ""
	
	# Step 5: Create GitHub repo and set as origin
	echo "--- Step 5: Create GitHub repository ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would run: gh repo create $project_name --$visibility --source=. --remote=origin --push"
	else
		cd "$target_dir"
		gh repo create "$project_name" --"$visibility" --source=. --remote=origin --push
	fi
	echo ""
	
	# Step 6: Create VPK sync configuration
	echo "--- Step 6: Configure VPK sync ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would create .vpk-sync.json"
	else
		cd "$target_dir"
		
		# Create .vpk-sync.json
		cat > .vpk-sync.json << EOF
{
  "upstream": {
    "url": "$vpk_upstream_url",
    "defaultBranch": "main"
  },
  "sync": {
    "strategy": "merge",
    "excludePaths": []
  },
  "push": {
    "useFork": false,
    "forkRemote": "origin"
  }
}
EOF
		echo "✓ Created .vpk-sync.json"
		
		# Commit the sync config
		git add .vpk-sync.json
		git commit -q -m "Add VPK sync configuration"
		git push origin main -q
		echo "✓ Committed sync configuration"
	fi
	echo ""
	
	# Summary
	echo "=== Success ==="
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "Dry run complete. No changes made."
		echo ""
		echo "Run without --dry-run to create the project."
	else
		echo "✓ Project created with preserved history!"
		echo ""
		[[ -n "$gh_user" ]] && echo "GitHub URL: https://github.com/$gh_user/$project_name"
		echo "Upstream:   $vpk_upstream_url"
		echo ""
		echo "VPK sync is configured! You can now:"
		echo "  • Pull VPK updates:  /vpk-sync --pull"
		echo "  • Push improvements: /vpk-sync --push"
		echo ""
		echo "Next steps:"
		echo "  cd $target_dir"
		echo "  pnpm install"
		echo ""
		echo "Or run /vpk-setup for full setup including environment configuration."
	fi
}

# -----------------------------------------------------------------------------
# Create standalone (fresh git history, no upstream connection)
# -----------------------------------------------------------------------------
do_create_standalone() {
	# Step 1: Clean source project
	echo "--- Step 1: Clean source project ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would clean source project"
	else
		# Remove local files (but not node_modules - that's handled by rsync exclude)
		for file in "${local_files[@]}"; do
			if [[ -e "$src/$file" ]]; then
				rm -f "$src/$file"
				echo "✓ Cleaned: $file"
			fi
		done
	fi
	echo ""
	
	# Step 2: Create target directory
	echo "--- Step 2: Create target directory ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would create: $target_dir"
	else
		mkdir -p "$target_dir"
		echo "✓ Created: $target_dir"
	fi
	echo ""
	
	# Step 3: Copy project files
	echo "--- Step 3: Copy project files ---"
	echo ""
	
	# Build rsync command
	rsync_cmd=(rsync -a)
	for ex in "${excludes[@]}"; do
		rsync_cmd+=(--exclude "$ex")
	done
	if [[ "$dry_run" == true ]]; then
		rsync_cmd+=(--dry-run -v)
		echo "[dry-run] Would copy files from $src to $target_dir"
		"${rsync_cmd[@]}" "$src/" "$target_dir/" | head -20
		echo "..."
	else
		"${rsync_cmd[@]}" "$src/" "$target_dir/"
		echo "✓ Files copied"
	fi
	
	# Re-include .env.local.example if it exists
	if [[ -f "$src/.env.local.example" && "$dry_run" != true ]]; then
		cp -f "$src/.env.local.example" "$target_dir/.env.local.example"
	fi
	echo ""
	
	# Step 4: Initialize git in target
	echo "--- Step 4: Initialize git ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would run: git init"
		echo "[dry-run] Would run: git add -A"
		echo "[dry-run] Would run: git commit -m 'Initial commit'"
	else
		cd "$target_dir"
		git init -q
		git add -A
		git commit -q -m "Initial commit"
		echo "✓ Git initialized and committed"
	fi
	echo ""
	
	# Step 5: Create GitHub repo and push
	echo "--- Step 5: Create GitHub repository ---"
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "[dry-run] Would run: gh repo create $project_name --$visibility --source=. --remote=origin --push"
	else
		cd "$target_dir"
		gh repo create "$project_name" --"$visibility" --source=. --remote=origin --push
	fi
	echo ""
	
	# Summary
	echo "=== Success ==="
	echo ""
	
	if [[ "$dry_run" == true ]]; then
		echo "Dry run complete. No changes made."
		echo ""
		echo "Run without --dry-run to create the project."
	else
		echo "✓ Standalone project created!"
		echo ""
		[[ -n "$gh_user" ]] && echo "GitHub URL: https://github.com/$gh_user/$project_name"
		echo ""
		echo "This is a standalone project with fresh git history."
		echo "To add VPK sync later, run: /vpk-sync --init"
		echo ""
		echo "Next steps:"
		echo "  cd $target_dir"
		echo "  pnpm install"
		echo ""
		echo "Or run /vpk-setup for full setup including environment configuration."
	fi
}

# =============================================================================
# MAIN
# =============================================================================

# Default to showing help if no mode specified
if [[ -z "$mode" ]]; then
	show_help
	exit 0
fi

case "$mode" in
	reset)
		do_reset
		;;
	export)
		do_export
		;;
	create)
		do_create
		;;
	*)
		echo "Unknown mode: $mode" >&2
		show_help >&2
		exit 1
		;;
esac
