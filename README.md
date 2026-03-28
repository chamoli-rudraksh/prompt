# ET NewsAI — AI-Native News Experience

An intelligence-first news platform with personalized feeds, deep AI briefings, and visual story tracking. Built for the ET AI Hackathon 2026.

![ET NewsAI](docs/banner.png) <!-- (Optional: Add a banner image here) -->

## ✨ Features

- **Personalized AI Feed**: A news feed tailored directly to your reading habits and interests, dynamically ranked using advanced embeddings.
- **Deep AI Briefings**: Get immediate, Llama 3.1-powered summaries and deep-dive conversational briefings on complex topics.
- **Visual Story Tracking (Story Arc)**: Automatically map out how a news event unfolds over time using sentiment analysis and graph structures.
- **Cross-Platform Readiness**: Completely fully-automated one-click setup scripts engineered for both Linux/macOS (`.sh`) and Windows (`.bat`).

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (Turbopack), React 19, TailwindCSS v4, Axios
- **Backend**: FastAPI, Python 3.12, Uvicorn, LangChain, SQLite, ChromaDB
- **AI Models**: Ollama (`llama3.1:8b`, `nomic-embed-text`)

## 🚀 Quickstart

### Prerequisites:
- **Node.js**: v18+
- **Python**: v3.11+
- **Ollama**: Installed and running in the background.

### 1. Automated Setup
This command automatically checks your environment, builds your Python virtual environment, installs all Node.js dependencies, provisions the database, and pulls the required local Ollama models.

**Linux / macOS:**
```bash
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### 2. Run the Application
Start the frontend and backend servers simultaneously with aggressive background process handling.

**Linux / macOS:**
```bash
./run.sh
```

**Windows:**
```cmd
run.bat
```

Once booted, navigate to:
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
