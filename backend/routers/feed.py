"""
Feed router — GET /feed — personalized articles with "why it matters" blurbs.
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from models.schemas import ArticleResponse, FeedResponse, SaveArticleRequest
from database import get_user, save_user_article as db_save_user_article
from ingestion import search_articles

router = APIRouter(tags=["feed"])
logger = logging.getLogger(__name__)


@router.get("/feed", response_model=FeedResponse)
async def get_feed(user_id: str = Query(...), limit: int = Query(20, le=50)):
    """
    Get personalized feed for a user.
    1. Fetch user profile
    2. Build search query from interests
    3. Semantic search for relevant articles
    4. Return articles immediately (no slow LLM calls)
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

    # 4. Return articles immediately with a static why_it_matters blurb
    result_articles = []
    for article in articles:
        why = f"As a {persona}, this relates to your interest in {interests[0] if interests else 'current affairs'}."
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
async def handle_save_article(req: SaveArticleRequest):
    """Save an article to user's saved list."""
    try:
        await db_save_user_article(req.user_id, req.article_id)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save article: {str(e)}")
