from fastapi import APIRouter, Depends
from auth import get_current_user
from database import DB_PATH
from utils.cache import get_cache, set_cache
import aiosqlite
import json

router = APIRouter()

@router.get("")
async def get_trending(current_user: dict = Depends(get_current_user)):

    # Step 1: cache key
    cache_key = "trending_news"

    # Step 2: check cache
    cached = get_cache(cache_key)
    if cached:
        return cached

    # Step 3: compute data
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

    data = {
        "topics": [
            {"name": t, "count": c}
            for t, c in sorted_topics[:8]
        ]
    }

    # Step 4: save to cache (2 min)
    set_cache(cache_key, data, ttl=120)

    # Step 5: return
    return data