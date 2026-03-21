#!/bin/bash
# ─────────────────────────────────────────────────────────────
# ET NewsAI — Build & Run Script
# Starts Ollama, Backend (FastAPI), and Frontend (Next.js)
# ─────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# ─── 1. Check prerequisites ────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   ET NewsAI — Build & Run${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found${NC}"

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo -e "${RED}✗ Ollama not found. Install from https://ollama.ai${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Ollama found${NC}"

# ─── 2. Start Ollama (if not already running) ──────────────────
echo ""
echo -e "${YELLOW}[1/5] Starting Ollama server...${NC}"
if curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${GREEN}  Ollama is already running${NC}"
else
    ollama serve &>/dev/null &
    OLLAMA_PID=$!
    sleep 3
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        echo -e "${GREEN}  Ollama started (PID: $OLLAMA_PID)${NC}"
    else
        echo -e "${RED}  Failed to start Ollama. Start it manually: ollama serve${NC}"
        exit 1
    fi
fi

# ─── 3. Pull required models ───────────────────────────────────
echo ""
echo -e "${YELLOW}[2/5] Pulling required Ollama models...${NC}"

LLM_MODEL="${LLM_MODEL:-mistral:latest}"
EMBED_MODEL="nomic-embed-text"

for MODEL in "$LLM_MODEL" "$EMBED_MODEL"; do
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo -e "${GREEN}  ✓ $MODEL already available${NC}"
    else
        echo -e "${CYAN}  Pulling $MODEL (this may take a few minutes)...${NC}"
        ollama pull "$MODEL"
        echo -e "${GREEN}  ✓ $MODEL pulled${NC}"
    fi
done

# ─── 4. Setup & start backend ──────────────────────────────────
echo ""
echo -e "${YELLOW}[3/5] Setting up backend...${NC}"
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    echo -e "${CYAN}  Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate
echo -e "${CYAN}  Installing Python dependencies...${NC}"
pip install -r requirements.txt --quiet

# Kill any existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1

echo -e "${CYAN}  Starting FastAPI backend on port 8000...${NC}"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready (up to 30 seconds)
echo -e "${CYAN}  Waiting for backend to be ready...${NC}"
RETRIES=0
MAX_RETRIES=15
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/health | grep -q "ok"; then
        echo -e "${GREEN}  ✓ Backend running at http://localhost:8000${NC}"
        break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 2
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}  ✗ Backend failed to start after 30s. Check logs above.${NC}"
    exit 1
fi

# ─── 5. Setup & start frontend ─────────────────────────────────
echo ""
echo -e "${YELLOW}[4/5] Setting up frontend...${NC}"
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  Installing Node.js dependencies...${NC}"
    npm install --silent
fi

echo -e "${CYAN}  Starting Next.js frontend on port 3000...${NC}"

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

npm run dev &
FRONTEND_PID=$!
sleep 5

# ─── 6. Done ───────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ ET NewsAI is running!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Frontend${NC}  → http://localhost:3000"
echo -e "  ${GREEN}Backend${NC}   → http://localhost:8000"
echo -e "  ${GREEN}API Docs${NC}  → http://localhost:8000/docs"
echo -e "  ${GREEN}Ollama${NC}    → http://localhost:11434"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
