"""
News Ingestion Pipeline — RSS fetching, scraping, summarization, embedding, storage.
Provides ingest_all_feeds() and search_articles().
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime

import feedparser
import requests
from bs4 import BeautifulSoup
import chromadb
from dotenv import load_dotenv

from llm import ask_llm, LLMUnavailableError
from embeddings import embed_text, embed_texts
from database import upsert_article, get_article_by_url, mark_article_embedded, get_articles_by_ids

load_dotenv()
logger = logging.getLogger(__name__)

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_store")

RSS_FEEDS = [
    {"url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms", "source": "Economic Times"},
    {"url": "https://www.livemint.com/rss/news", "source": "LiveMint"},
    {"url": "https://www.thehindubusinessline.com/feeder/default.rss", "source": "The Hindu Business Line"},
    {"url": "https://feeds.feedburner.com/NDTV-Business", "source": "NDTV Business"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", "source": "Times of India"},
]

ALLOWED_TOPICS = [
    "markets", "startups", "policy", "technology", "economy",
    "banking", "energy", "geopolitics", "corporate", "agriculture",
]

# ChromaDB client (persistent storage)
_chroma_client = None
_collection = None


def _get_chroma_collection():
    """Lazy-init ChromaDB client and collection."""
    global _chroma_client, _collection
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name="articles",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _fetch_rss(feed_url: str) -> list[dict]:
    """Parse an RSS feed and return list of entry dicts."""
    try:
        parsed = feedparser.parse(feed_url)
        entries = []
        for entry in parsed.entries[:20]:  # Limit to 20 per feed
            entries.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "summary": entry.get("summary", entry.get("description", "")),
                "published": entry.get("published", entry.get("updated", "")),
            })
        return entries
    except Exception as e:
        logger.error(f"Error fetching RSS feed {feed_url}: {e}")
        return []


def _scrape_full_text(url: str) -> str:
    """Scrape full article text from URL. Falls back to empty string on failure."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Try <article> tag first, then main content divs
        article = soup.find("article")
        if article:
            paragraphs = article.find_all("p")
        else:
            # Try common content containers
            main = soup.find("main") or soup.find("div", class_="article-body") or soup
            paragraphs = main.find_all("p")

        text = " ".join(p.get_text(strip=True) for p in paragraphs)
        # Limit to ~1500 words
        words = text.split()
        if len(words) > 1500:
            text = " ".join(words[:1500])
        return text
    except Exception as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return ""


async def _generate_summary(content: str) -> str:
    """Generate a 2-sentence summary of article content using LLM."""
    if not content or len(content.strip()) < 50:
        return ""
    try:
        prompt = (
            "Summarize this news article in exactly 2 sentences. "
            "Be factual and concise.\n\n"
            f"Article: {content[:3000]}"
        )
        return await ask_llm(prompt)
    except LLMUnavailableError:
        logger.warning("LLM unavailable for summary generation")
        return ""


async def _extract_topics(title: str, content: str) -> list[str]:
    """Extract topic tags from article using LLM."""
    try:
        prompt = (
            "Return a JSON array of 3-5 topic tags for this article. Use only tags from this "
            f"allowed list: {', '.join(ALLOWED_TOPICS)}. "
            "Return ONLY the JSON array, nothing else.\n\n"
            f"Article title: {title}\n"
            f"Article: {content[:500]}"
        )
        response = await ask_llm(prompt)
        # Extract JSON array from response
        response = response.strip()
        # Handle cases where LLM wraps in markdown code block
        if "```" in response:
            start = response.find("[")
            end = response.rfind("]") + 1
            if start >= 0 and end > start:
                response = response[start:end]
        topics = json.loads(response)
        if isinstance(topics, list):
            # Filter to only allowed topics
            return [t.lower().strip() for t in topics if t.lower().strip() in ALLOWED_TOPICS]
        return ["general"]
    except (json.JSONDecodeError, LLMUnavailableError, Exception):
        return ["general"]


async def _process_article(entry: dict, source_name: str) -> dict | None:
    """Process a single RSS entry: scrape, summarize, extract topics, store."""
    url = entry.get("link", "")
    if not url:
        return None

    # Check if article already exists
    existing = await get_article_by_url(url)
    if existing is not None:
        return existing

    title = entry.get("title", "Untitled")
    rss_summary = entry.get("summary", "")
    published = entry.get("published", datetime.now().isoformat())

    # Step 2: Full text extraction
    full_text = await asyncio.to_thread(_scrape_full_text, url)
    content = full_text if full_text else rss_summary

    # Strip HTML from RSS summary fallback
    if content == rss_summary and content:
        soup = BeautifulSoup(content, "html.parser")
        content = soup.get_text(strip=True)

    if not content:
        return None

    # Step 3: Generate summary
    summary = await _generate_summary(content)
    if not summary:
        # Fall back to first 2 sentences of content
        sentences = content.split(". ")
        summary = ". ".join(sentences[:2]) + "." if sentences else content[:200]

    # Step 4: Extract topics
    topics = await _extract_topics(title, content)

    # Step 6: Save to SQLite
    article_id = str(uuid.uuid4())
    await upsert_article(
        article_id=article_id,
        title=title,
        content=content,
        summary=summary,
        url=url,
        source=source_name,
        published_at=published,
        topics=topics,
        embedded=0,
    )

    # Step 5: Embed and store in ChromaDB (background, don't block)
    try:
        embed_text_str = f"{title}. {summary}"
        embedding = await asyncio.to_thread(embed_text, embed_text_str)
        collection = _get_chroma_collection()
        collection.upsert(
            ids=[article_id],
            embeddings=[embedding],
            documents=[embed_text_str],
            metadatas=[{
                "title": title,
                "source": source_name,
                "published_at": str(published),
                "topics": json.dumps(topics),
                "url": url,
            }],
        )
        await mark_article_embedded(article_id)
    except Exception as e:
        logger.error(f"Failed to embed article {article_id}: {e}")

    return {
        "id": article_id,
        "title": title,
        "content": content,
        "summary": summary,
        "url": url,
        "source": source_name,
        "published_at": published,
        "topics": topics,
    }


async def ingest_all_feeds() -> int:
    """
    Main ingestion pipeline: fetch all RSS feeds, process each article.
    Returns the count of newly ingested articles.
    """
    logger.info("Starting news ingestion pipeline...")
    total_new = 0

    for feed_info in RSS_FEEDS:
        logger.info(f"Fetching RSS from {feed_info['source']}...")
        entries = await asyncio.to_thread(_fetch_rss, feed_info["url"])
        logger.info(f"  Found {len(entries)} entries from {feed_info['source']}")

        for entry in entries:
            try:
                result = await _process_article(entry, feed_info["source"])
                if result and "id" in result:
                    total_new += 1
            except Exception as e:
                logger.error(f"Error processing article '{entry.get('title', '?')}': {e}")
                continue

    logger.info(f"Ingestion complete. {total_new} new articles processed.")
    return total_new


async def search_articles(query: str, n: int = 10) -> list[dict]:
    """
    Semantic search: embed the query, search ChromaDB, merge with SQLite data.
    Returns top n articles sorted by relevance.
    """
    try:
        collection = _get_chroma_collection()
        if collection.count() == 0:
            return []

        query_embedding = await asyncio.to_thread(embed_text, query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n, collection.count()),
            include=["metadatas", "distances", "documents"],
        )

        if not results or not results["ids"] or not results["ids"][0]:
            return []

        article_ids = results["ids"][0]
        metadatas = results["metadatas"][0] if results["metadatas"] else [{}] * len(article_ids)
        distances = results["distances"][0] if results["distances"] else [1.0] * len(article_ids)

        # Fetch full article data from SQLite
        articles_from_db = await get_articles_by_ids(article_ids)
        db_lookup = {a["id"]: a for a in articles_from_db}

        articles = []
        for i, aid in enumerate(article_ids):
            if aid in db_lookup:
                article = db_lookup[aid].copy()
                article["relevance_score"] = 1.0 - distances[i] if i < len(distances) else 0.0
                articles.append(article)
            else:
                # Fallback to metadata if not in SQLite
                meta = metadatas[i] if i < len(metadatas) else {}
                articles.append({
                    "id": aid,
                    "title": meta.get("title", ""),
                    "source": meta.get("source", ""),
                    "url": meta.get("url", ""),
                    "published_at": meta.get("published_at", ""),
                    "topics": json.loads(meta.get("topics", "[]")),
                    "summary": "",
                    "content": "",
                    "relevance_score": 1.0 - distances[i] if i < len(distances) else 0.0,
                })

        # Sort by relevance score descending
        articles.sort(key=lambda a: a.get("relevance_score", 0), reverse=True)
        return articles

    except Exception as e:
        logger.error(f"Search error: {e}")
        return []
