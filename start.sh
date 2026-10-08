#!/usr/bin/env bash
set -e

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Ensure Node 20+ is active (Vite & Vue 3 require Node >= 18)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    \. "$NVM_DIR/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || nvm use >/dev/null 2>&1 || true
fi

# Fallback: check current major version, load direct Node 20 path if needed
NODE_VER=$(node -v 2>/dev/null || echo "v0")
MAJOR_VER=$(echo "$NODE_VER" | sed 's/v//' | cut -d'.' -f1)
if [ "$MAJOR_VER" -lt 18 ]; then
    if [ -d "$HOME/.nvm/versions/node/v20.20.2/bin" ]; then
        export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
    fi
fi

echo "=================================================="
echo "   ⭐ Sirius Web Wallet Dev Server Launcher       "
echo "=================================================="
echo "Node runtime : $(node -v) ($(which node))"
echo "URL          : http://localhost:5173"
echo "Network      : http://0.0.0.0:5173"
echo "=================================================="
echo "Press Ctrl+C to stop the wallet server."
echo ""

# 2. Start Vite server
exec npx vite --port 5173 --host 0.0.0.0
