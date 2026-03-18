"""
Database module — SQLite setup via aiosqlite.
Creates tables on startup and provides async CRUD helpers.
"""

import os
import json
import uuid
from datetime import datetime

import aiosqlite
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./etnewsai.db")


async def get_db() -> aiosqlite.Connection:
    """Get an async SQLite connection."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Create all tables if they don't exist."""
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                persona TEXT,
                interests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                summary TEXT,
                url TEXT UNIQUE,
                source TEXT,
                published_at TIMESTAMP,
                topics TEXT,
                embedded INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                topic TEXT,
                messages TEXT,
                article_ids TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS saved_articles (
                user_id TEXT,
                article_id TEXT,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, article_id)
            );
        """)
        await db.commit()
    finally:
        await db.close()


# ─── User CRUD ───────────────────────────────────────────────────────────────

async def create_user(name: str, persona: str, interests: list[str]) -> dict:
    user_id = str(uuid.uuid4())
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO users (id, name, persona, interests) VALUES (?, ?, ?, ?)",
            (user_id, name, persona, json.dumps(interests)),
        )
        await db.commit()
        return {"id": user_id, "name": name, "persona": persona, "interests": interests}
    finally:
        await db.close()


async def get_user(user_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "persona": row["persona"],
            "interests": json.loads(row["interests"]) if row["interests"] else [],
            "created_at": row["created_at"],
        }
    finally:
        await db.close()


# ─── Article CRUD ────────────────────────────────────────────────────────────

async def upsert_article(
    article_id: str,
    title: str,
    content: str,
    summary: str,
    url: str,
    source: str,
    published_at: str,
    topics: list[str],
    embedded: int = 0,
) -> None:
    db = await get_db()
    try:
        await db.execute(
            """INSERT OR REPLACE INTO articles
               (id, title, content, summary, url, source, published_at, topics, embedded)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (article_id, title, content, summary, url, source, published_at, json.dumps(topics), embedded),
        )
        await db.commit()
    finally:
        await db.close()


async def get_article(article_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return _row_to_article(row)
    finally:
        await db.close()


async def get_articles_by_ids(article_ids: list[str]) -> list[dict]:
    if not article_ids:
        return []
    db = await get_db()
    try:
        placeholders = ",".join("?" for _ in article_ids)
        cursor = await db.execute(
            f"SELECT * FROM articles WHERE id IN ({placeholders})", article_ids
        )
        rows = await cursor.fetchall()
        return [_row_to_article(row) for row in rows]
    finally:
        await db.close()


async def get_article_by_url(url: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM articles WHERE url = ?", (url,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return _row_to_article(row)
    finally:
        await db.close()


async def mark_article_embedded(article_id: str) -> None:
    db = await get_db()
    try:
        await db.execute("UPDATE articles SET embedded = 1 WHERE id = ?", (article_id,))
        await db.commit()
    finally:
        await db.close()


def _row_to_article(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "summary": row["summary"],
        "url": row["url"],
        "source": row["source"],
        "published_at": row["published_at"],
        "topics": json.loads(row["topics"]) if row["topics"] else [],
        "embedded": row["embedded"],
    }


# ─── Conversation CRUD ──────────────────────────────────────────────────────

async def create_conversation(
    user_id: str, topic: str, article_ids: list[str], messages: list[dict] | None = None
) -> str:
    conv_id = str(uuid.uuid4())
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO conversations (id, user_id, topic, messages, article_ids) VALUES (?, ?, ?, ?, ?)",
            (conv_id, user_id, topic, json.dumps(messages or []), json.dumps(article_ids)),
        )
        await db.commit()
        return conv_id
    finally:
        await db.close()


async def get_conversation(conv_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "topic": row["topic"],
            "messages": json.loads(row["messages"]) if row["messages"] else [],
            "article_ids": json.loads(row["article_ids"]) if row["article_ids"] else [],
            "created_at": row["created_at"],
        }
    finally:
        await db.close()


async def append_message(conv_id: str, role: str, content: str) -> None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT messages FROM conversations WHERE id = ?", (conv_id,))
        row = await cursor.fetchone()
        if row is None:
            return
        messages = json.loads(row["messages"]) if row["messages"] else []
        messages.append({"role": role, "content": content})
        await db.execute(
            "UPDATE conversations SET messages = ? WHERE id = ?",
            (json.dumps(messages), conv_id),
        )
        await db.commit()
    finally:
        await db.close()


# ─── Saved Articles CRUD ────────────────────────────────────────────────────

async def save_user_article(user_id: str, article_id: str) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO saved_articles (user_id, article_id) VALUES (?, ?)",
            (user_id, article_id),
        )
        await db.commit()
    finally:
        await db.close()


async def get_saved_articles(user_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT a.* FROM articles a
               JOIN saved_articles sa ON a.id = sa.article_id
               WHERE sa.user_id = ?
               ORDER BY sa.saved_at DESC""",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [_row_to_article(row) for row in rows]
    finally:
        await db.close()


# ─── New helpers for ingestion pipeline ──────────────────────────────────────

async def article_exists(article_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT 1 FROM articles WHERE id = ?", (article_id,)
        )
        row = await cursor.fetchone()
        return row is not None


async def save_article(article: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO articles
               (id, title, content, summary, url, source,
                published_at, topics, embedded)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                article["id"], article["title"], article["content"],
                article["summary"], article["url"], article["source"],
                article["published_at"],
                json.dumps(article.get("topics", [])),
                article.get("embedded", 0),
            )
        )
        await db.commit()


async def mark_embedded(article_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE articles SET embedded = 1 WHERE id = ?", (article_id,)
        )
        await db.commit()


async def get_article_by_id(article_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM articles WHERE id = ?", (article_id,)
        )
        row = await cursor.fetchone()
        if row:
            d = dict(row)
            d["topics"] = json.loads(d.get("topics", "[]"))
            return d
        return None


async def get_recent_articles(limit: int = 50) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM articles ORDER BY published_at DESC LIMIT ?",
            (limit,)
        )
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["topics"] = json.loads(d.get("topics", "[]"))
            result.append(d)
        return result

