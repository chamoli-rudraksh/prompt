import json
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import DB_PATH
import aiosqlite

router = APIRouter()


@router.get("")
async def get_trending(current_user: dict = Depends(get_current_user)):
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
    return {
        "topics": [
            {"name": t, "count": c}
            for t, c in sorted_topics[:8]
        ]
    }
