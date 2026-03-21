import time
import asyncio
from agents.state import AgentState
from database import log_agent_action
import feedparser
import httpx
from bs4 import BeautifulSoup

BACKUP_FEEDS = [
    "https://feeds.feedburner.com/NDTV-Business",
    "https://www.thehindubusinessline.com/feeder/default.rss",
]

PRIMARY_FEEDS = [
    "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.livemint.com/rss/news",
    "https://www.moneycontrol.com/rss/MCtopnews.xml",
    "https://www.business-standard.com/rss/home_page_top_stories.rss",
    "https://www.financialexpress.com/feed/",
]


async def fetch_one_feed(url: str) -> list:
    try:
        parsed = feedparser.parse(url)
        entries = parsed.entries[:25]
        source = parsed.feed.get("title", url.split("/")[2])
        return [
            {
                "title": e.get("title", "").strip(),
                "url": e.get("link", ""),
                "summary": e.get("summary", "") or e.get("description", ""),
                "published": e.get("published", ""),
                "source": source,
            }
            for e in entries if e.get("link") and e.get("title")
        ]
    except Exception as e:
        return []


async def ingestion_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "IngestionAgent"
    state["current_agent"] = agent_name

    try:
        # Try primary feeds first
        results = await asyncio.gather(*[fetch_one_feed(url) for url in PRIMARY_FEEDS])
        articles = [a for feed in results for a in feed]

        # If primary feeds returned very little, use backup feeds
        if len(articles) < 10:
            state["errors"].append("Primary feeds returned few articles, trying backup feeds")
            backup_results = await asyncio.gather(*[fetch_one_feed(url) for url in BACKUP_FEEDS])
            backup_articles = [a for feed in backup_results for a in feed]
            articles.extend(backup_articles)

        # Deduplicate by URL
        seen = set()
        unique = []
        for a in articles:
            if a["url"] not in seen:
                seen.add(a["url"])
                unique.append(a)

        state["raw_articles"] = unique
        duration_ms = int((time.time() - start) * 1000)

        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="success",
            user_id=state.get("user_id"),
            input_data={"feed_count": len(PRIMARY_FEEDS)},
            output_data={"articles_fetched": len(unique)},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Fetched {len(unique)} articles from {len(PRIMARY_FEEDS)} feeds",
        })

    except Exception as e:
        error_msg = str(e)
        state["errors"].append(f"{agent_name}: {error_msg}")
        state["raw_articles"] = []

        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="failed",
            error=error_msg,
            retry_count=state.get("retry_count", 0),
        )

    return state
