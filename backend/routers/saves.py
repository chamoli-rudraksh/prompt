from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from database import DB_PATH
import aiosqlite
import json

router = APIRouter()

class SaveBody(BaseModel):
    article_id: str

class ReadBody(BaseModel):
    article_id: str
    time_spent: int = 0


@router.post("/save")
async def save_article(
    body: SaveBody,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO saved_articles (user_id, article_id) VALUES (?,?)",
            (user_id, body.article_id)
        )
        await db.commit()
    return {"saved": True}


@router.delete("/save/{article_id}")
async def unsave_article(
    article_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM saved_articles WHERE user_id=? AND article_id=?",
            (user_id, article_id)
        )
        await db.commit()
    return {"saved": False}


@router.get("/saves")
async def get_saved(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT a.* FROM articles a
            JOIN saved_articles s ON a.id = s.article_id
            WHERE s.user_id = ?
            ORDER BY s.saved_at DESC
        """, (user_id,))
        rows = await cursor.fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["topics"] = json.loads(d.get("topics", "[]"))
        result.append(d)
    return {"articles": result}


@router.post("/read")
async def mark_read(
    body: ReadBody,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO reading_history
            (user_id, article_id, time_spent)
            VALUES (?,?,?)
        """, (user_id, body.article_id, body.time_spent))
        await db.commit()
    return {"ok": True}
