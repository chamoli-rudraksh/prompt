import feedparser
import httpx
import asyncio
import uuid
import json
import os
import hashlib
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
from database import save_article, article_exists, mark_embedded
from embeddings import get_embedding
from llm import ask_llm

# Disable ChromaDB telemetry before import to avoid posthog version conflict
os.environ["ANONYMIZED_TELEMETRY"] = "False"
import chromadb
from chromadb.config import Settings

CHROMA = chromadb.PersistentClient(
    path=os.getenv("CHROMA_PATH", "./chroma_store"),
    settings=Settings(anonymized_telemetry=False),
)
COLLECTION = CHROMA.get_or_create_collection("articles")
LONG_COLLECTION = CHROMA.get_or_create_collection("articles_longterm")

CUTOFF_HOURS = 24

# Global semaphore to limit concurrent LLM calls (Ollama handles 1 at a time)
_llm_semaphore = asyncio.Semaphore(1)

# Semaphore to limit concurrent embedding calls to 3
EMBED_SEMAPHORE = asyncio.Semaphore(3)

RSS_FEEDS = [
    "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.livemint.com/rss/news",
    "https://www.moneycontrol.com/rss/MCtopnews.xml",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

ALLOWED_TOPICS = [
    "markets", "startups", "policy", "technology", "economy",
    "banking", "energy", "geopolitics", "corporate", "agriculture",
    "inflation", "rbi", "budget", "ipo", "mutual funds"
]

# Skip scraping for paywalled/slow domains — use RSS summary instead
SKIP_SCRAPE_DOMAINS = [
    "economictimes.indiatimes.com",
    "livemint.com",
    "business-standard.com",
    "financialexpress.com",
]


def should_scrape(url: str) -> bool:
    return not any(d in url for d in SKIP_SCRAPE_DOMAINS)


def is_recent(published_str: str) -> bool:
    try:
        import email.utils
        parsed = email.utils.parsedate_to_datetime(published_str)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CUTOFF_HOURS)
        return parsed >= cutoff
    except Exception:
        return True


async def fetch_full_text(url: str) -> str:
    try:
        async with httpx.AsyncClient(
            headers=HEADERS, timeout=6, follow_redirects=True
        ) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return ""
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer",
                              "aside", "header", "form", "iframe"]):
                tag.decompose()
            article = soup.find("article") or soup.find("main") or soup.find("body")
            if not article:
                return ""
            paragraphs = article.find_all("p")
            text = " ".join(p.get_text(strip=True) for p in paragraphs)
            words = text.split()
            return " ".join(words[:800])
    except Exception:
        return ""


async def generate_summary(content: str, title: str) -> str:
    if not content:
        return title
    prompt = (
        f"Summarize this news article in exactly 2 sentences. "
        f"Be factual, specific, and concise. No opinions.\n\n"
        f"Title: {title}\n\n"
        f"Article: {content[:1500]}"
    )
    try:
        async with _llm_semaphore:
            return await ask_llm(prompt)
    except Exception:
        return title


async def extract_topics(title: str, content: str) -> list:
    prompt = (
        f"Return a JSON array of 3-5 topic tags for this news article. "
        f"You MUST only use tags from this exact list: "
        f"{json.dumps(ALLOWED_TOPICS)}. "
        f"Return ONLY the JSON array with no explanation, no markdown, "
        f"no backticks. Example: [\"markets\", \"rbi\", \"banking\"]\n\n"
        f"Title: {title}\n"
        f"Content: {content[:400]}"
    )
    try:
        async with _llm_semaphore:
            raw = await ask_llm(prompt)
        raw = raw.strip().strip("`").replace("json", "").strip()
        topics = json.loads(raw)
        valid = [t for t in topics if t in ALLOWED_TOPICS]
        return valid if valid else ["economy"]
    except Exception:
        return ["economy"]


async def embed_and_store(article: dict):
    async with EMBED_SEMAPHORE:
        text_to_embed = f"{article['title']}. {article['summary']}"
        embedding = get_embedding(text_to_embed)
        metadata = {
            "title": article["title"],
            "source": article["source"],
            "published_at": article["published_at"],
            "topics": json.dumps(article["topics"]),
            "url": article["url"],
            "summary": article["summary"],
            "id": article["id"],
        }
        # Short-term collection (used for feed and navigator)
        COLLECTION.upsert(
            ids=[article["id"]],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[text_to_embed],
        )
        # Long-term collection (used for story arc — never purged)
        LONG_COLLECTION.upsert(
            ids=[article["id"]],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[text_to_embed],
        )
        await mark_embedded(article["id"])


async def process_article(entry: dict, source_name: str):
    url = entry.get("link", "")
    if not url:
        return

    article_id = hashlib.md5(url.encode()).hexdigest()
    if await article_exists(article_id):
        return

    published_str = entry.get("published", "")
    if published_str and not is_recent(published_str):
        return

    title = entry.get("title", "").strip()
    if not title:
        return

    # Skip scraping for paywalled/slow domains
    if should_scrape(url):
        content = await fetch_full_text(url)
    else:
        content = ""

    if not content:
        content = entry.get("summary", "") or entry.get("description", "")
    content = content.strip()

    # Run sequentially to avoid overwhelming Ollama
    summary = await generate_summary(content, title)
    topics = await extract_topics(title, content)

    published_at = published_str or datetime.now(timezone.utc).isoformat()

    article = {
        "id": article_id,
        "title": title,
        "content": content,
        "summary": summary,
        "url": url,
        "source": source_name,
        "published_at": published_at,
        "topics": topics,
        "embedded": 0,
    }

    await save_article(article)
    await embed_and_store(article)
    print(f"[INGESTED] {source_name}: {title[:60]}")


async def ingest_feed(feed_url: str):
    try:
        parsed = feedparser.parse(feed_url)
        source_name = parsed.feed.get("title", feed_url.split("/")[2])
        entries = parsed.entries[:5]  # Limit per feed for speed
        for entry in entries:
            await process_article(entry, source_name)
    except Exception as e:
        print(f"[ERROR] Feed failed {feed_url}: {e}")


async def ingest_all_feeds():
    print(f"[INGESTION] Starting at {datetime.now(timezone.utc).isoformat()}")
    await asyncio.gather(*[ingest_feed(url) for url in RSS_FEEDS])
    print(f"[INGESTION] Complete at {datetime.now(timezone.utc).isoformat()}")


async def search_articles(query: str, n: int = 10) -> list:
    from llm import get_embeddings
    from langchain_chroma import Chroma

    vectorstore = Chroma(
        collection_name="articles",
        embedding_function=get_embeddings(),
        persist_directory=os.getenv("CHROMA_PATH", "./chroma_store"),
    )

    # MMR search with relevance score threshold
    results = vectorstore.similarity_search_with_relevance_scores(
        query, k=n * 2  # fetch double, then filter
    )

    # Only keep articles with relevance score above 0.35
    filtered = [
        (doc, score) for doc, score in results if score >= 0.35
    ]

    # Sort by score descending, take top n
    filtered.sort(key=lambda x: x[1], reverse=True)
    filtered = filtered[:n]

    articles = []
    for doc, score in filtered:
        meta = doc.metadata
        articles.append({
            "id": meta.get("id", ""),
            "title": meta.get("title", ""),
            "summary": meta.get("summary", ""),
            "url": meta.get("url", ""),
            "source": meta.get("source", ""),
            "published_at": meta.get("published_at", ""),
            "topics": json.loads(meta.get("topics", "[]")),
            "content": doc.page_content,
            "relevance_score": round(score, 3),
        })

    return articles
