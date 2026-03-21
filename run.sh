#!/bin/bash
# ─────────────────────────────────────────────────────────────
# ET NewsAI — Fast Run Script
# ─────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo -e "\n${YELLOW}Shutting down ET NewsAI...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   ET NewsAI — Starting Services${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"

# Check if setup was run
if [ ! -d "$ROOT_DIR/backend/venv" ] || [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    echo -e "${RED}✗ Setup incomplete. Please run ./setup.sh first.${NC}"
    exit 1
fi

# 1. Start Ollama
echo -e "${YELLOW}[1/3] Checking Ollama...${NC}"
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${CYAN}  Starting Ollama server...${NC}"
    ollama serve &>/dev/null &
    sleep 3
fi
echo -e "${GREEN}  ✓ Ollama is running${NC}"

# 2. Start Backend
echo -e "${YELLOW}[2/3] Starting Backend...${NC}"
cd "$ROOT_DIR/backend"
source venv/bin/activate

# Clean ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 &
BACKEND_PID=$!

# 3. Start Frontend
echo -e "${YELLOW}[3/3] Starting Frontend...${NC}"
cd "$ROOT_DIR/frontend"

# Clean ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}🚀 ET NewsAI is up!${NC}"
echo -e "  → Frontend: http://localhost:3000"
echo -e "  → Backend:  http://localhost:8000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
