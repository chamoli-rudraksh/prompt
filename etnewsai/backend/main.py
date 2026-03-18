"""
FastAPI application entry point.
CORS, router registration, startup events (DB init + scheduler).
"""

import asyncio
import logging
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from scheduler import start_scheduler, run_initial_ingestion
from routers import users, feed, navigator, story

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("Starting ET NewsAI backend...")
    await init_db()
    logger.info("Database initialized")

    # Load demo data if available
    await _load_demo_data()

    # Start scheduler for background news ingestion
    start_scheduler()
    logger.info("Scheduler started")

    # Run initial ingestion in background (don't block startup)
    asyncio.create_task(run_initial_ingestion())

    yield

    # Shutdown
    logger.info("Shutting down ET NewsAI backend...")


app = FastAPI(
    title="ET NewsAI",
    description="AI-Native News Experience — ET AI Hackathon 2026",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users.router)
app.include_router(feed.router)
app.include_router(navigator.router)
app.include_router(story.router)


# ─── Demo data routes ────────────────────────────────────────────────────────

@app.get("/demo/feed")
async def get_demo_feed():
    """Return pre-loaded demo feed data."""
    return _read_demo_json("demo_feed.json")


@app.get("/demo/briefing")
async def get_demo_briefing():
    """Return pre-loaded demo briefing data."""
    return _read_demo_json("demo_briefing.json")


@app.get("/demo/story-arc")
async def get_demo_story_arc():
    """Return pre-loaded demo story arc data."""
    return _read_demo_json("demo_story_arc.json")


# ─── Error handlers ─────────────────────────────────────────────────────────

@app.exception_handler(422)
async def validation_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "detail": str(exc)},
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ─── Health check ───────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ET NewsAI Backend"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _read_demo_json(filename: str) -> dict:
    """Read a demo data JSON file."""
    demo_dir = os.path.join(os.path.dirname(__file__), "demo_data")
    filepath = os.path.join(demo_dir, filename)
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": f"Demo data file {filename} not found"}
    except json.JSONDecodeError:
        return {"error": f"Invalid JSON in {filename}"}


async def _load_demo_data():
    """Pre-load demo user and articles into DB if not already present."""
    from database import get_user, create_user, upsert_article

    # Create demo user if not exists
    demo_user = await get_user("demo-user-001")
    if demo_user is None:
        try:
            from database import get_db
            db = await get_db()
            try:
                await db.execute(
                    "INSERT OR IGNORE INTO users (id, name, persona, interests) VALUES (?, ?, ?, ?)",
                    ("demo-user-001", "Demo User", "investor", json.dumps(["markets", "startups", "policy"])),
                )
                await db.commit()
            finally:
                await db.close()
            logger.info("Demo user created")
        except Exception as e:
            logger.warning(f"Failed to create demo user: {e}")

    # Load demo articles into DB
    demo_feed = _read_demo_json("demo_feed.json")
    if "articles" in demo_feed:
        for article in demo_feed["articles"]:
            try:
                await upsert_article(
                    article_id=article.get("id", ""),
                    title=article.get("title", ""),
                    content=article.get("summary", ""),
                    summary=article.get("summary", ""),
                    url=article.get("url", ""),
                    source=article.get("source", ""),
                    published_at=article.get("published_at", ""),
                    topics=article.get("topics", []),
                    embedded=0,
                )
            except Exception:
                continue
        logger.info(f"Loaded {len(demo_feed['articles'])} demo articles")
