# ET NewsAI — AI-Native News Experience

> Built for ET AI Hackathon 2026 — Problem Statement 8

A news intelligence platform that transforms how professionals consume business news using AI-powered personalization, deep briefings, and visual story tracking.

## Features

1. **My ET Feed** — Personalized news feed with AI-generated "why this matters to you" blurbs
2. **News Navigator** — Deep AI briefing on any topic + interactive follow-up chat (RAG)
3. **Story Arc Tracker** — Visual timeline, player map, sentiment chart, and contrarian view for any ongoing story

## Setup

### Prerequisites

- Node.js 18+, Python 3.11+, Ollama installed

### 1. Terminal 1

```bash
ollama serve
```

### 2. Terminal 2

```bash
cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 3. Terminal 3

```bash
cd frontend && npm run dev
```

### 4. Open http://localhost:3000

## Architecture

ET NewsAI uses a 3-layer architecture:

- **Presentation Layer (Next.js 14)** — App Router, TypeScript, Tailwind CSS, D3.js visualizations. Handles onboarding, personalized feed rendering, briefing display, chat streaming, and story arc visualizations.

- **Intelligence Layer (FastAPI)** — Async Python backend with pluggable LLM wrapper (Ollama/Claude), RAG pipeline using ChromaDB + sentence-transformers, and structured prompt engineering for briefings, summaries, and analysis.

- **Data Layer** — SQLite for user profiles, article cache, and conversation history. ChromaDB for semantic vector search. RSS ingestion pipeline with background scheduling (every 30 mins).

### LLM Pluggability

The LLM is abstracted behind a single file (`llm.py`). Switching from Ollama to Claude requires changing only 2 lines in `.env`:

```
LLM_PROVIDER=claude
CLAUDE_API_KEY=your-key-here
```

Zero code changes needed anywhere else.

## Demo Mode

Click the "Demo" button in the navbar to see the full product instantly with pre-loaded data — no Ollama required.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, D3.js, Axios
- **Backend**: FastAPI, Python 3.11+, Uvicorn
- **AI/ML**: Ollama (llama3.1:8b), sentence-transformers (all-MiniLM-L6-v2)
- **Storage**: SQLite (aiosqlite), ChromaDB
- **Ingestion**: feedparser, BeautifulSoup4, APScheduler
