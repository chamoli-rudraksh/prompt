"""
Feed router — GET /feed — personalized articles with "why it matters" blurbs.
Parallel blurb generation with caching for speed.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query, Depends

from models.schemas import ArticleResponse, FeedResponse, SaveArticleRequest
from database import (
    get_user, save_user_article as db_save_user_article,
    get_cached_blurb, save_blurb_cache,
)
from ingestion import search_articles
from llm import ask_llm
from auth import get_current_user

router = APIRouter(tags=["feed"])
logger = logging.getLogger(__name__)


async def generate_why_it_matters(article: dict, persona: str, interests: list[str]) -> str:
    """Generate a personalized why-it-matters blurb with caching."""
    article_id = article.get("id", "")

    # Check cache first
    cached = await get_cached_blurb(article_id, persona)
    if cached:
        return cached

    # Build persona-specific framing instructions
    persona_lower = persona.lower() if persona else ""
    if "student" in persona_lower or "beginner" in persona_lower:
        framing = (
            f"The reader is a {persona}. Use simple language, avoid jargon. "
            f"Explain concepts like you're teaching. Start with 'Here's what this means:' "
            f"or 'Simply put,'. Add a brief definition if there's a financial term."
        )
    elif "cfo" in persona_lower or "professional" in persona_lower:
        framing = (
            f"The reader is a {persona}. Use precise financial language. "
            f"Focus on P&L impact, risk exposure, and regulatory implications. "
            f"Be dense and data-driven. Start with 'Impact analysis:' or 'Key exposure:'."
        )
    elif "founder" in persona_lower or "startup" in persona_lower:
        framing = (
            f"The reader is a {persona}. Frame through the lens of startup opportunity, "
            f"funding climate, M&A signals, and tech trends. "
            f"Start with 'Opportunity signal:' or 'Startup impact:'."
        )
    elif "trader" in persona_lower or "trading" in persona_lower:
        framing = (
            f"The reader is a {persona}. Focus on price action, market sentiment, "
            f"sector rotation, and trading setups. Use market terminology. "
            f"Start with 'Market signal:' or 'Trade insight:'."
        )
    else:
        framing = (
            f"The reader is a {persona}. Tailor the explanation to their specific "
            f"professional context and interests. Be specific and actionable."
        )

    # Generate blurb
    interest_str = ", ".join(interests[:3]) if interests else "current affairs"
    prompt = (
        f"{framing}\n\n"
        f"Their areas of interest: {interest_str}.\n\n"
        f"In 1-2 short sentences, explain why this news matters to them personally. "
        f"Be specific, actionable, and directly relevant.\n\n"
        f"Title: {article.get('title', '')}\n"
        f"Summary: {article.get('summary', '')[:300]}"
    )

    try:
        blurb = await ask_llm(prompt)
        # Cache the result
        await save_blurb_cache(article_id, persona, blurb)
        return blurb
    except Exception:
        return f"As a {persona}, this relates to your interest in {interest_str}."


def keyword_overlaps(article: dict, interests: list[str]) -> bool:
    """Check if article has keyword overlap with any interest."""
    if not interests:
        return True
    title = (article.get("title", "") or "").lower()
    summary = (article.get("summary", "") or "").lower()
    text = f"{title} {summary}"
    for interest in interests:
        words = interest.lower().split()
        for word in words:
            if len(word) > 2 and word in text:
                return True
    # Also check topics
    article_topics = [t.lower() for t in article.get("topics", [])]
    for interest in interests:
        if interest.lower() in article_topics:
            return True
    return False


@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    limit: int = Query(20, le=50),
    current_user: dict = Depends(get_current_user)
):
    """
    Get personalized feed for a user.
    1. Fetch user profile
    2. Build search query from interests
    3. Semantic search for relevant articles
    4. Filter by keyword overlap
    5. Generate blurbs in parallel with caching
    """
    # 1. Get user profile
    user_id = current_user["user_id"]
    user = await get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    persona = user["persona"]
    interests = user["interests"]
    name = user["name"]

    # 2. Build search query from interests
    interests_str = " ".join(interests)
    search_query = f"{interests_str} news India business"

    # 3. Semantic search
    try:
        articles = await search_articles(search_query, n=limit * 2)
    except Exception as e:
        logger.error(f"Feed search error: {e}")
        articles = []

    if not articles:
        return FeedResponse(articles=[], user_name=name, persona=persona)

    # 4. Keyword pre-filter: drop articles with zero keyword overlap
    filtered_articles = [a for a in articles if keyword_overlaps(a, interests)]
    if not filtered_articles:
        filtered_articles = articles  # fallback to all if filter removes everything
    filtered_articles = filtered_articles[:limit]

    # 5. Generate all why-it-matters blurbs in parallel
    blurbs = await asyncio.gather(*[
        generate_why_it_matters(article, persona, interests)
        for article in filtered_articles
    ])

    result_articles = []
    for article, why in zip(filtered_articles, blurbs):
        result_articles.append(ArticleResponse(
            id=article.get("id", ""),
            title=article.get("title", ""),
            summary=article.get("summary", ""),
            url=article.get("url", ""),
            source=article.get("source", ""),
            published_at=article.get("published_at"),
            topics=article.get("topics", []),
            why_it_matters=why,
        ))

    return FeedResponse(articles=result_articles, user_name=name, persona=persona)


@router.post("/saved-articles")
async def handle_save_article(
    req: SaveArticleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save an article to user's saved list."""
    try:
        user_id = current_user["user_id"]
        # Allow saving for own user_id, ignoring req.user_id if we want stricter security,
        # but for compatibility, we just enforce the Depends.
        if req.user_id and req.user_id != user_id:
            raise HTTPException(status_code=403, detail="Cannot save articles for another user")
        
        await db_save_user_article(user_id, req.article_id)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save article: {str(e)}")
