# ET NewsAI — AI-Native News Experience

> Built for ET AI Hackathon 2026 — Problem Statement 8

A news intelligence platform that transforms how professionals consume business news using AI-powered personalization, deep briefings, and visual story tracking.

## Features

1. **My ET Feed** — Personalized news feed with AI-generated "why this matters to you" blurbs
2. **News Navigator** — Deep AI briefing on any topic + interactive follow-up chat (RAG)
3. **Story Arc Tracker** — Visual timeline, player map, sentiment chart, and contrarian view for any ongoing story

---

## Building & Running the Project

### Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| **Python** | 3.11+ | [python.org](https://python.org) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Ollama** | latest | [ollama.ai](https://ollama.ai) |

### Quick Start (One Command)

```bash
chmod +x run.sh
./run.sh
```

This will:
- ✅ Check all prerequisites
- ✅ Start Ollama server (if not already running)
- ✅ Pull required models (`mistral:latest`, `nomic-embed-text`)
- ✅ Create Python venv & install backend dependencies
- ✅ Install Node.js dependencies
- ✅ Start FastAPI backend on **port 8000**
- ✅ Start Next.js frontend on **port 3000**

### Manual Setup (Step by Step)

#### 1. Start Ollama & Pull Models

```bash
# Start Ollama server
ollama serve

# In another terminal — pull the required models
ollama pull mistral:latest
ollama pull nomic-embed-text
```

#### 2. Start the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

#### 4. Open the App

Go to **http://localhost:3000** in your browser.

### Environment Variables

The backend reads from `backend/.env`:

```env
LLM_PROVIDER=ollama
LLM_MODEL=mistral:latest
OLLAMA_BASE_URL=http://localhost:11434
DB_PATH=./etnewsai.db
CHROMA_PATH=./chroma_store
FRONTEND_URL=http://localhost:3000
```

> To use a different Ollama model, change `LLM_MODEL` in `.env` and make sure to `ollama pull <model>` first.

---

## Architecture

ET NewsAI uses a 3-layer architecture with LangGraph-powered agent pipelines:

- **Presentation Layer (Next.js 14)** — App Router, TypeScript, Tailwind CSS, D3.js visualizations. Handles onboarding, personalized feed rendering, briefing display, chat streaming, and story arc visualizations.

- **Intelligence Layer (FastAPI + LangGraph)** — Async Python backend with LangGraph agent orchestration:
  - **IngestionAgent** → Fetches articles from 6+ RSS feeds
  - **ProcessingAgent** → Summarizes, tags topics, embeds into ChromaDB
  - **RelevanceAgent** → Semantic vector search for query-relevant articles
  - **BriefingAgent** → Generates structured briefings with validation
  - **StoryArcAgent** → Builds timelines, player maps, sentiment analysis

- **Data Layer** — SQLite for user profiles, article cache, and conversation history. ChromaDB for semantic vector search. RSS ingestion pipeline with background scheduling (every 30 mins).

### LLM Configuration

The LLM is abstracted behind `llm.py` and uses local Ollama by default:

```env
LLM_PROVIDER=ollama
LLM_MODEL=mistral:latest
OLLAMA_BASE_URL=http://localhost:11434
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/users` | POST | Create user |
| `/users/{id}` | GET | Get user profile |
| `/feed` | GET | Personalized news feed |
| `/briefing` | POST | AI briefing on a topic |
| `/chat` | POST | Follow-up chat |
| `/story-arc` | POST | Story arc analysis |
| `/admin/logs` | GET | Agent pipeline logs |
| `/admin/refresh-news` | POST | Trigger manual ingestion |

## Demo Mode

Click the "Demo" button in the navbar to see the full product instantly with pre-loaded data — no Ollama required.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, D3.js, Axios
- **Backend**: FastAPI, Python 3.11+, Uvicorn, LangGraph, LangChain
- **AI/ML**: Ollama (mistral:latest), sentence-transformers (nomic-embed-text)
- **Storage**: SQLite (aiosqlite), ChromaDB
- **Ingestion**: feedparser, BeautifulSoup4, APScheduler
