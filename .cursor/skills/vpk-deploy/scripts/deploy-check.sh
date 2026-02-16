#!/bin/bash
set -euo pipefail

echo "🔍 Pre-deployment Checks"
echo ""

ERRORS=0

# Check for backend package-lock.json
echo "📦 Checking backend dependencies..."
if [ ! -f backend/package-lock.json ]; then
    echo "⚠️  Missing backend/package-lock.json"
    echo "   Run: cd backend && npm install && cd .."
    ERRORS=$((ERRORS + 1))
else
    echo "✅ backend/package-lock.json exists"
    
    # Check if package-lock.json has pnpm symlinks (common issue)
    if grep -q '"link": true' backend/package-lock.json 2>/dev/null; then
        echo "❌ backend/package-lock.json contains pnpm symlinks"
        echo "   This will cause 'Cannot find module' errors in Docker"
        echo "   Fix: cd backend && rm -rf node_modules package-lock.json && npm install"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ backend/package-lock.json has proper npm format"
    fi
fi

# Check Node version in Dockerfile
echo ""
echo "🐳 Checking Dockerfile configuration..."
if [ -f backend/Dockerfile ]; then
    NODE_VERSION=$(grep -E "^FROM node:" backend/Dockerfile | head -1 | grep -oE "node:[0-9]+" | grep -oE "[0-9]+" || echo "0")
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "⚠️  Dockerfile uses Node $NODE_VERSION, but Next.js 16+ requires Node 20+"
        echo "   Update backend/Dockerfile: FROM node:20-alpine"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Dockerfile uses Node $NODE_VERSION"
    fi
else
    echo "⚠️  backend/Dockerfile not found"
    ERRORS=$((ERRORS + 1))
fi

# Check next.config.ts has export support
echo ""
echo "⚙️  Checking next.config.ts..."
if [ -f next.config.ts ]; then
    if grep -q "NEXT_OUTPUT" next.config.ts; then
        echo "✅ next.config.ts has NEXT_OUTPUT export configuration"
    else
        echo "⚠️  next.config.ts missing NEXT_OUTPUT export configuration"
        echo "   Add conditional export support for production builds:"
        echo '   ...(process.env.NEXT_OUTPUT === "export" && { output: "export" }),'
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  next.config.ts not found"
    ERRORS=$((ERRORS + 1))
fi

# Check required ASAP environment variables for production
echo ""
echo "🔐 Checking environment variables..."
if [ -z "${ASAP_PRIVATE_KEY:-}" ] || [ -z "${ASAP_KID:-}" ] || [ -z "${ASAP_ISSUER:-}" ]; then
    echo "⚠️  Missing ASAP credentials for production deployment"
    echo "   Required: ASAP_PRIVATE_KEY, ASAP_KID, ASAP_ISSUER"
    echo "   Note: These are set on Micros, not locally. Ensure they're configured."
else
    echo "✅ ASAP credentials present"
fi

# Check AI Gateway configuration
if [ -z "${AI_GATEWAY_URL:-}" ]; then
    echo "⚠️  Missing AI_GATEWAY_URL (may be set on Micros)"
else
    echo "✅ AI_GATEWAY_URL set"
fi

if [ -z "${AI_GATEWAY_USE_CASE_ID:-}" ]; then
    echo "⚠️  Missing AI_GATEWAY_USE_CASE_ID (may be set on Micros)"
else
    echo "✅ AI_GATEWAY_USE_CASE_ID set"
fi

# Check Docker is running
echo ""
echo "🐋 Checking Docker..."
if docker ps > /dev/null 2>&1; then
    echo "✅ Docker is running"
else
    echo "⚠️  Docker is not running or not accessible"
    echo "   Start Docker Desktop before deploying"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -gt 0 ]; then
    echo "❌ Pre-deployment checks found $ERRORS issue(s)"
    echo "   Fix the issues above before deploying"
    exit 1
else
    echo "✅ All pre-deployment checks passed"
    echo "   Ready to deploy!"
fi
