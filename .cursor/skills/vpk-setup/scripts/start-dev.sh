#!/bin/bash
set -e

# Parse command line arguments
NO_WAIT=false
FORCE_KILL=false
for arg in "$@"; do
    case $arg in
        --no-wait)
            NO_WAIT=true
            shift
            ;;
        --force-kill)
            FORCE_KILL=true
            shift
            ;;
    esac
done

echo "🚀 Starting VPK Development Environment"
echo "======================================"

# Stop only services started by this script
echo "🛑 Cleaning up existing processes..."
if [ -f .dev-pids ]; then
    ./.cursor/skills/vpk-setup/scripts/stop-dev.sh
else
    echo "   ℹ️  No PID file found; leaving existing services running."
fi

# Wait a moment for ports to be released
sleep 1

# Force kill zombie processes on default ports if requested
if [ "$FORCE_KILL" = true ]; then
    echo "   🔪 Force killing processes on ports 3000-3019 and 8080-8099..."
    for port in $(seq 3000 3019) $(seq 8080 8099); do
        lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
    done
    sleep 1
    echo "   ✅ Ports cleared"
fi

# Handle stale Next.js dev lock (prevents multiple instances)
if [ -f .next/dev/lock ]; then
    # Check if any Next.js dev server is actually running
    NEXT_RUNNING=false
    for port in $(seq 3000 3019); do
        if lsof -n -P -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
            NEXT_RUNNING=true
            break
        fi
    done
    
    if [ "$NEXT_RUNNING" = true ]; then
        echo "⚠️  Next.js dev lock detected and a dev server is already running."
        echo "   Options:"
        echo "   1. Stop it first: ./.cursor/skills/vpk-setup/scripts/stop-dev.sh"
        echo "   2. Force kill: ./.cursor/skills/vpk-setup/scripts/start-dev.sh --force-kill"
        echo "   3. Let auto-port-finding use next available port (continuing...)"
        echo ""
        # Don't exit - let the port-finding logic handle it
    else
        echo "   ℹ️  Removing stale Next.js dev lock (no server running)"
        rm -f .next/dev/lock
    fi
fi

echo "✅ Environment ready (port auto-discovery enabled: 3000-3019, 8080-8099)"

# Start Express backend
echo "🖥️  Starting Express backend..."
if [ "$NO_WAIT" = true ]; then
    # For AI/automated execution - use nohup to detach
    nohup pnpm run dev:backend > /dev/null 2>&1 &
else
    pnpm run dev:backend &
fi
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start and write its port file
echo "   Waiting for backend to initialize..."
for i in $(seq 1 10); do
    if [ -f .dev-backend-port ]; then
        break
    fi
    sleep 0.5
done

# Read backend port
BACKEND_PORT=8080
if [ -f .dev-backend-port ]; then
    BACKEND_PORT=$(cat .dev-backend-port | tr -d '[:space:]')
    if [ "$BACKEND_PORT" != "8080" ]; then
        echo "   ℹ️  Port 8080 was in use, backend using port $BACKEND_PORT"
    fi
fi

# Start frontend
echo "🎨 Starting Next.js frontend..."
if [ "$NO_WAIT" = true ]; then
    # For AI/automated execution - use nohup to detach
    nohup pnpm run dev:frontend > /dev/null 2>&1 &
else
    pnpm run dev:frontend &
fi
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "🎉 All services started!"
echo "   - Express Backend: http://localhost:${BACKEND_PORT}"
echo "   - Frontend: http://localhost:3000 (or next available port 3001-3019)"
echo ""
echo "💡 Port auto-discovery: If default ports are in use, servers automatically find available ports."
echo "💡 To stop all services: ./.cursor/skills/vpk-setup/scripts/stop-dev.sh"

# Save PIDs for cleanup script
echo "$BACKEND_PID $FRONTEND_PID" > .dev-pids

if [ "$NO_WAIT" = true ]; then
    echo ""
    echo "✅ Servers started in background"
else
    # Keep script running to maintain processes (for manual/terminal use)
    wait
fi
