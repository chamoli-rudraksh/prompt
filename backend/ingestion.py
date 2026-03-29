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


def generate_summary(content: str, title: str) -> str:
    """Fast local summary — no LLM needed for ingestion.
    Uses the first ~2 sentences of the content or falls back to title."""
    if not content:
        return title
    # Strip HTML remnants
    from bs4 import BeautifulSoup
    text = BeautifulSoup(content, "html.parser").get_text(separator=" ", strip=True)
    text = " ".join(text.split())  # normalize whitespace
    # Extract first 2-3 sentences
    sentences = []
    for sep in ["। ", ". ", "! ", "? "]:
        if sep in text:
            parts = text.split(sep)
            sentences = [parts[0] + sep.strip()]
            if len(parts) > 1:
                sentences.append(parts[1].split(sep[0])[0] + sep.strip() if sep[0] in parts[1] else parts[1])
            break
    if sentences:
        summary = " ".join(sentences).strip()
        return summary[:400] if len(summary) > 400 else summary
    # Fallback: first 300 chars
    return text[:300] if len(text) > 300 else text


# Keyword sets for fast topic extraction (no LLM needed)
TOPIC_KEYWORDS = {
    "markets": ["stock", "share", "sensex", "nifty", "bse", "nse", "rally", "bull", "bear", "equity",
                "index", "trading", "investor", "portfolio", "dividend", "ipo", "listing", "market"],
    "startups": ["startup", "founder", "funding", "venture", "unicorn", "seed", "series a", "series b",
                 "incubator", "accelerator", "entrepreneur"],
    "policy": ["policy", "regulation", "government", "ministry", "parliament", "bill", "law", "sebi",
               "compliance", "mandate", "notification", "gazette", "amendment"],
    "technology": ["tech", "software", "ai", "artificial intelligence", "machine learning", "data",
                   "cloud", "cyber", "digital", "saas", "app", "platform", "algorithm"],
    "economy": ["economy", "gdp", "growth", "fiscal", "trade", "export", "import", "deficit",
                "surplus", "employment", "unemployment", "wage"],
    "banking": ["bank", "banking", "loan", "credit", "deposit", "npa", "nbfc", "fintech",
                "payment", "upi", "lending", "mortgage"],
    "energy": ["energy", "oil", "gas", "solar", "wind", "renewable", "power", "electricity",
               "coal", "petroleum", "opec", "fuel", "ev", "electric vehicle"],
    "geopolitics": ["geopolitics", "china", "us ", "usa", "russia", "pakistan", "trade war",
                    "tariff", "sanction", "nato", "diplomacy", "bilateral", "summit"],
    "corporate": ["corporate", "company", "merger", "acquisition", "revenue", "profit", "loss",
                  "quarterly", "annual", "earnings", "board", "ceo", "management", "restructure"],
    "agriculture": ["agriculture", "farm", "crop", "msp", "kisan", "harvest", "monsoon",
                    "irrigation", "fertilizer", "agri"],
    "inflation": ["inflation", "cpi", "wpi", "price rise", "deflation", "cost of living",
                  "consumer price"],
    "rbi": ["rbi", "reserve bank", "repo rate", "monetary policy", "interest rate", "liquidity",
            "forex reserve", "rupee"],
    "budget": ["budget", "finance minister", "fiscal deficit", "tax", "gst", "income tax",
               "customs duty", "allocation"],
    "ipo": ["ipo", "initial public offering", "listing", "allotment", "grey market", "gmp",
            "public issue", "book building"],
    "mutual funds": ["mutual fund", "sip", "nav", "amc", "fund manager", "thematic fund",
                     "index fund", "etf"],
}


def extract_topics_fast(title: str, content: str) -> list:
    """Fast keyword-based topic extraction — no LLM needed for ingestion."""
    text = f"{title} {content}".lower()
    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[topic] = score
    if not scores:
        return ["economy"]
    # Return top 3-5 topics sorted by match count
    sorted_topics = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [t[0] for t in sorted_topics[:min(5, max(3, len(sorted_topics)))]]


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

    # Fast local processing — no LLM calls needed
    summary = generate_summary(content, title)
    topics = extract_topics_fast(title, content)

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
    """Semantic search using the COLLECTION singleton (same client that ingestion writes to)."""
    query_embedding = get_embedding(query)

    results = COLLECTION.query(
        query_embeddings=[query_embedding],
        n_results=min(n * 2, COLLECTION.count() or 1),
        include=["documents", "metadatas", "distances"],
    )

    if not results or not results.get("ids") or not results["ids"][0]:
        return []

    articles = []
    for i, doc_id in enumerate(results["ids"][0]):
        distance = results["distances"][0][i]
        # ChromaDB returns L2 distances; convert to similarity score (0-1 range)
        # For normalized embeddings, distance is in [0, 2], similarity = 1 - distance/2
        similarity = 1.0 - (distance / 2.0)

        if similarity < 0.35:
            continue

        meta = results["metadatas"][0][i]
        articles.append({
            "id": meta.get("id", doc_id),
            "title": meta.get("title", ""),
            "summary": meta.get("summary", ""),
            "url": meta.get("url", ""),
            "source": meta.get("source", ""),
            "published_at": meta.get("published_at", ""),
            "topics": json.loads(meta.get("topics", "[]")),
            "content": results["documents"][0][i] if results["documents"] else "",
            "relevance_score": round(similarity, 3),
        })

    # Sort by relevance descending, take top n
    articles.sort(key=lambda x: x["relevance_score"], reverse=True)
    return articles[:n]
