import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

from database import init_db, get_agent_logs
from ingestion import ingest_all_feeds
from scheduler import start_scheduler
from routers import feed, navigator, story, users
from routers.auth import router as auth_router
from routers.market import router as market_router
from routers.trending import router as trending_router
from routers.saves import router as saves_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    from agents.graph import ingest_graph, make_initial_state
    asyncio.create_task(
        ingest_graph.ainvoke(make_initial_state(task="ingest"))
    )
    yield

app = FastAPI(title="ET NewsAI API", version="1.0.0", lifespan=lifespan)

# ── Rate limiter ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if FRONTEND_URL and FRONTEND_URL not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/auth",     tags=["auth"])
app.include_router(users.router,      tags=["users"])
app.include_router(feed.router,       tags=["feed"])
app.include_router(navigator.router,  tags=["navigator"])
app.include_router(story.router,      tags=["story"])
app.include_router(market_router,     prefix="/market",   tags=["market"])
app.include_router(trending_router,   prefix="/trending", tags=["trending"])
app.include_router(saves_router,      prefix="/articles", tags=["saves"])

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/admin/refresh-news")
async def refresh_news():
    asyncio.create_task(ingest_all_feeds())
    return {"status": "ingestion started"}


@app.get("/admin/logs")
async def get_logs(limit: int = 100):
    logs = await get_agent_logs(limit)
    return {"logs": logs}
