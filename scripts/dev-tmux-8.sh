#!/usr/bin/env bash

set -euo pipefail

SESSION_NAME="vpk-dev"
WINDOW_NAME="ports"
POOL_SIZE="${ROVODEV_POOL_SIZE:-6}"
SITE_URL="${ROVODEV_SITE_URL:-https://hello.atlassian.net}"

PORT_FILE=".dev-rovodev-port"
PORTS_FILE=".dev-rovodev-ports"
FRONTEND_PORT_FILE=".dev-frontend-port"
BACKEND_PORT_FILE=".dev-backend-port"

if ! [[ "$POOL_SIZE" =~ ^[0-9]+$ ]]; then
	echo "ROVODEV_POOL_SIZE must be an integer >= 1 (current: $POOL_SIZE)"
	exit 1
fi

if [[ "$POOL_SIZE" -lt 1 ]]; then
	echo "ROVODEV_POOL_SIZE must be >= 1 (current: $POOL_SIZE)"
	exit 1
fi

resolve_rovodev_cmd() {
	if command -v rovodev >/dev/null 2>&1; then
		echo "rovodev"
		return
	fi

	if command -v acli >/dev/null 2>&1; then
		echo "acli rovodev"
		return
	fi

	echo "Neither 'rovodev' nor 'acli' is installed or on PATH."
	exit 1
}

prepare_port_files() {
	node - <<'NODE' "$POOL_SIZE"
const fs = require("node:fs");
const { getRovodevBasePort } = require("./scripts/lib/worktree-ports");

const poolSize = Number.parseInt(process.argv[2], 10);
const basePort = getRovodevBasePort();

if (!Number.isFinite(poolSize) || poolSize < 1) {
	console.error(`Invalid ROVODEV_POOL_SIZE: ${process.argv[2]}`);
	process.exit(1);
}

const ports = Array.from({ length: poolSize }, (_, index) => basePort + index);

fs.writeFileSync(".dev-rovodev-port", String(ports[0]));
fs.writeFileSync(".dev-rovodev-ports", JSON.stringify(ports));

console.log(`[tmux] RovoDev pool ports: ${ports.join(", ")}`);
NODE
}

cleanup_port_files() {
	rm -f "$PORT_FILE" "$PORTS_FILE"
}

resolve_frontend_backend_ports() {
	node - <<'NODE'
const fs = require("node:fs");
const { getPortInfo } = require("./scripts/lib/worktree-ports");

const info = getPortInfo();
const frontend = fs.existsSync(".dev-frontend-port")
	? fs.readFileSync(".dev-frontend-port", "utf8").trim()
	: String(info.frontendBase);
const backend = fs.existsSync(".dev-backend-port")
	? fs.readFileSync(".dev-backend-port", "utf8").trim()
	: String(info.backendBase);

process.stdout.write(`${frontend} ${backend}`);
NODE
}

apply_window_styling() {
	local frontend_port backend_port ports_pair
	ports_pair="$(resolve_frontend_backend_ports)"
	frontend_port="${ports_pair%% *}"
	backend_port="${ports_pair##* }"

	tmux set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-border-status top
	tmux set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-border-style "fg=colour238"
	tmux set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-active-border-style "fg=colour39"
	tmux set-window-option -t "$SESSION_NAME:$WINDOW_NAME" pane-border-format "#{?#{==:#{pane_index},0},#[fg=green,bold] Frontend (${frontend_port}),#{?#{==:#{pane_index},1},#[fg=yellow,bold] Backend (${backend_port}),#[fg=cyan,bold] RovoDev #{pane_title}}}#[default]"

	tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.0" -T "frontend:${frontend_port}" 2>/dev/null || true
	tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.1" -T "backend:${backend_port}" 2>/dev/null || true

	if [[ -f "$PORT_FILE" ]]; then
		local base_port
		base_port="$(cat "$PORT_FILE")"
		for index in $(seq 0 $((POOL_SIZE - 1))); do
			local pane
			local port
			pane=$((index + 2))
			port=$((base_port + index))
			tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.$pane" -T "$port" 2>/dev/null || true
		done
	fi
}

start_session() {
	if ! command -v tmux >/dev/null 2>&1; then
		echo "tmux is not installed. Install tmux first."
		exit 1
	fi

	local rovodev_cmd
	rovodev_cmd="$(resolve_rovodev_cmd)"

	if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
		apply_window_styling
		echo "Session '$SESSION_NAME' already exists. Attaching..."
		exec tmux attach -t "$SESSION_NAME"
	fi

	prepare_port_files

	local base_port
	base_port="$(cat "$PORT_FILE")"

	tmux new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME"

	local total_panes
	total_panes=$((POOL_SIZE + 2))

	for _ in $(seq 1 $((total_panes - 1))); do
		tmux split-window -t "$SESSION_NAME:$WINDOW_NAME"
		tmux select-layout -t "$SESSION_NAME:$WINDOW_NAME" tiled
	done

	tmux set-option -t "$SESSION_NAME" remain-on-exit on
	apply_window_styling

	for index in $(seq 0 $((POOL_SIZE - 1))); do
		pane=$((index + 2))
		port=$((base_port + index))
		tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.$pane" -T "$port"
		cmd="cd \"$(pwd)\" && $rovodev_cmd serve --disable-session-token --respect-configured-permissions --site-url \"$SITE_URL\" $port"
		tmux send-keys -t "$SESSION_NAME:$WINDOW_NAME.$pane" "$cmd" C-m
	done

	local frontend_port backend_port ports_pair
	ports_pair="$(resolve_frontend_backend_ports)"
	frontend_port="${ports_pair%% *}"
	backend_port="${ports_pair##* }"

	tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.0" -T "frontend:${frontend_port}"
	tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.1" -T "backend:${backend_port}"
	tmux send-keys -t "$SESSION_NAME:$WINDOW_NAME.1" "cd \"$(pwd)\" && ROVODEV_SUPERVISOR=tmux pnpm run dev:backend" C-m
	tmux send-keys -t "$SESSION_NAME:$WINDOW_NAME.0" "cd \"$(pwd)\" && pnpm run dev:frontend" C-m

	tmux select-layout -t "$SESSION_NAME:$WINDOW_NAME" tiled
	tmux select-pane -t "$SESSION_NAME:$WINDOW_NAME.0"

	echo "Session '$SESSION_NAME' started with $total_panes panes (frontend, backend, $POOL_SIZE rovodev ports)."
	echo "Attach with: tmux attach -t $SESSION_NAME"
	exec tmux attach -t "$SESSION_NAME"
}

stop_session() {
	if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
		tmux kill-session -t "$SESSION_NAME"
		echo "Stopped tmux session '$SESSION_NAME'."
	else
		echo "No tmux session named '$SESSION_NAME' found."
	fi

	cleanup_port_files
	echo "Removed $PORT_FILE and $PORTS_FILE."
}

style_session() {
	if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
		apply_window_styling
		echo "Applied pane styling to '$SESSION_NAME:$WINDOW_NAME'."
		return
	fi

	echo "No tmux session named '$SESSION_NAME' found."
	exit 1
}

attach_session() {
	if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
		apply_window_styling
		exec tmux attach -t "$SESSION_NAME"
	fi

	echo "No tmux session named '$SESSION_NAME' found."
	exit 1
}

status_session() {
	echo "Session: $SESSION_NAME"
	if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
		echo "tmux: running"
		tmux list-panes -t "$SESSION_NAME:$WINDOW_NAME" -F "pane #{pane_index}: #{pane_current_command} (#{pane_dead_status})"
	else
		echo "tmux: stopped"
	fi

	if [[ -f "$PORT_FILE" ]]; then
		echo "$PORT_FILE: $(cat "$PORT_FILE")"
	else
		echo "$PORT_FILE: missing"
	fi

	if [[ -f "$PORTS_FILE" ]]; then
		echo "$PORTS_FILE: $(cat "$PORTS_FILE")"
	else
		echo "$PORTS_FILE: missing"
	fi
}

usage() {
	echo "Usage: $0 [start|stop|attach|status]"
	echo ""
	echo "Commands:"
	echo "  start   Start or attach tmux 8-pane dev session (default)"
	echo "  stop    Stop tmux session and remove rovodev port files"
	echo "  attach  Attach to existing tmux session"
	echo "  style   Apply pane styling to existing session"
	echo "  status  Show tmux and port-file status"
}

command="${1:-start}"

case "$command" in
	start)
		start_session
		;;
	stop)
		stop_session
		;;
	attach)
		attach_session
		;;
	style)
		style_session
		;;
	status)
		status_session
		;;
	-h|--help|help)
		usage
		;;
	*)
		echo "Unknown command: $command"
		usage
		exit 1
		;;
esac
