"""
Feed router — GET /feed — personalized articles with "why it matters" blurbs.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query

from models.schemas import ArticleResponse, FeedResponse, SaveArticleRequest
from database import get_user, save_article
from ingestion import search_articles
from llm import ask_llm, LLMUnavailableError

router = APIRouter(tags=["feed"])
logger = logging.getLogger(__name__)


async def _generate_why_it_matters(article: dict, persona: str, interests: list[str]) -> str:
    """Generate a 'why it matters' blurb for a specific article and user."""
    try:
        interests_str = ", ".join(interests)
        prompt = (
            f"The user is a {persona} interested in {interests_str}.\n"
            f"This article is about: {article.get('title', '')}\n"
            f"In one sentence (max 20 words), explain specifically why this article matters to this user.\n"
            f"Be direct. Start with 'This matters because...' or 'As a {persona},...'"
        )
        return await ask_llm(prompt)
    except LLMUnavailableError:
        return f"As a {persona}, this relates to your interest in {interests[0] if interests else 'current affairs'}."
    except Exception as e:
        logger.error(f"Error generating why_it_matters: {e}")
        return ""


@router.get("/feed", response_model=FeedResponse)
async def get_feed(user_id: str = Query(...), limit: int = Query(20, le=50)):
    """
    Get personalized feed for a user.
    1. Fetch user profile
    2. Build search query from interests
    3. Semantic search for relevant articles
    4. Generate 'why it matters' blurbs in parallel
    """
    # 1. Get user profile
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
        articles = await search_articles(search_query, n=limit)
    except Exception as e:
        logger.error(f"Feed search error: {e}")
        articles = []

    if not articles:
        return FeedResponse(articles=[], user_name=name, persona=persona)

    # 4. Generate 'why it matters' blurbs in parallel using asyncio.gather
    async def _enrich_article(article: dict) -> ArticleResponse:
        why = await _generate_why_it_matters(article, persona, interests)
        return ArticleResponse(
            id=article.get("id", ""),
            title=article.get("title", ""),
            summary=article.get("summary", ""),
            url=article.get("url", ""),
            source=article.get("source", ""),
            published_at=article.get("published_at"),
            topics=article.get("topics", []),
            why_it_matters=why,
        )

    enriched = await asyncio.gather(
        *[_enrich_article(a) for a in articles],
        return_exceptions=True,
    )

    # Filter out exceptions
    result_articles = [a for a in enriched if isinstance(a, ArticleResponse)]

    return FeedResponse(articles=result_articles, user_name=name, persona=persona)


@router.post("/saved-articles")
async def save_user_article(req: SaveArticleRequest):
    """Save an article to user's saved list."""
    try:
        await save_article(req.user_id, req.article_id)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save article: {str(e)}")
