import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from ingestion import ingest_all_feeds
from scheduler import start_scheduler
from routers import feed, navigator, story, users

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    asyncio.create_task(ingest_all_feeds())
    yield

app = FastAPI(title="ET NewsAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,      tags=["users"])
app.include_router(feed.router,       tags=["feed"])
app.include_router(navigator.router,  tags=["navigator"])
app.include_router(story.router,      tags=["story"])

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/admin/refresh-news")
async def refresh_news():
    asyncio.create_task(ingest_all_feeds())
    return {"status": "ingestion started"}
