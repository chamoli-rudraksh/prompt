#!/bin/bash
# ─────────────────────────────────────────────────────────────
# ET NewsAI — One-Time Setup Script
# ─────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   ET NewsAI — Environment Setup${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# 0. Kill any running ET NewsAI processes to avoid conflicts
echo -e "${YELLOW}Cleaning up any running services...${NC}"
for port in 3000 3001 3002 8000; do
    fuser -k $port/tcp 2>/dev/null || true
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done
pkill -9 -f "next-server.*$ROOT_DIR" 2>/dev/null || true
pkill -9 -f "next dev.*$ROOT_DIR" 2>/dev/null || true
pkill -9 -f "uvicorn main:app" 2>/dev/null || true
rm -f "$ROOT_DIR/frontend/.next/dev/lock"
echo -e "${GREEN}  ✓ Cleanup done${NC}"
echo ""

# 1. Check prerequisites
echo -e "${YELLOW}[1/4] Checking prerequisites...${NC}"

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Python 3 found${NC}"

if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v) found${NC}"

if ! command -v ollama &>/dev/null; then
    echo -e "${RED}✗ Ollama not found. Install from https://ollama.ai${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Ollama found${NC}"

# 2. Setup Backend
echo ""
echo -e "${YELLOW}[2/4] Setting up backend...${NC}"
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    echo -e "${CYAN}  Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate
echo -e "${CYAN}  Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Initialise .env if missing (not overwriting existing)
if [ ! -f ".env" ]; then
    echo -e "${CYAN}  Creating default .env file...${NC}"
    cat <<EOF > .env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434
DB_PATH=./etnewsai.db
CHROMA_PATH=./chroma_store
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
FRONTEND_URL=http://localhost:3000
EOF
fi

# 3. Setup Frontend
echo ""
echo -e "${YELLOW}[3/4] Setting up frontend...${NC}"
cd "$ROOT_DIR/frontend"

echo -e "${CYAN}  Installing Node.js dependencies (this may take a while)...${NC}"
npm install

# 4. Ollama Models
echo ""
echo -e "${YELLOW}[4/4] Ensuring Ollama models are present...${NC}"
# Make sure ollama is running to pull models
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${CYAN}  Starting Ollama temporarily to pull models...${NC}"
    ollama serve &>/dev/null &
    TEMP_OLLAMA_PID=$!
    sleep 3
fi

for MODEL in "llama3.1:8b" "nomic-embed-text"; do
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo -e "${GREEN}  ✓ $MODEL already available${NC}"
    else
        echo -e "${CYAN}  Pulling $MODEL...${NC}"
        ollama pull "$MODEL"
    fi
done

if [ ! -z "$TEMP_OLLAMA_PID" ]; then
    kill $TEMP_OLLAMA_PID
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Setup complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "You can now run the project using: ${YELLOW}./run.sh${NC}"
echo ""
