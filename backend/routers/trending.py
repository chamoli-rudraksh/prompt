import json
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import DB_PATH
from utils.cache import get_cache, set_cache   # ✅ add this
import aiosqlite

router = APIRouter()

CACHE_KEY = "trending"   # ✅ add this


@router.get("")
async def get_trending(current_user: dict = Depends(get_current_user)):
    
    # ✅ check cache first
    cached = get_cache(CACHE_KEY)
    if cached:
        return cached

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            SELECT topics FROM articles
            WHERE published_at >= datetime('now', '-24 hours')
            AND topics IS NOT NULL
        """)
        rows = await cursor.fetchall()

    counts = {}
    for row in rows:
        try:
            topics = json.loads(row[0])
            for t in topics:
                counts[t] = counts.get(t, 0) + 1
        except Exception:
            continue

    sorted_topics = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    response = {
        "topics": [
            {"name": t, "count": c}
            for t, c in sorted_topics[:8]
        ]
    }

    # ✅ save to cache
    set_cache(CACHE_KEY, response)

    return response