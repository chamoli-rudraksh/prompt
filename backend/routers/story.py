"""
Story Arc router — POST /story-arc
Generates timeline, player map, sentiment chart, and contrarian view.
Uses long-term ChromaDB collection for multi-day story tracking.
"""

import json
import logging
import traceback
import os

from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user
from models.schemas import (
    StoryArcRequest, StoryArcResponse,
    ArticleResponse, TimelineEvent, Player, SentimentPoint,
)
from llm import get_story_arc as llm_get_story_arc

router = APIRouter(tags=["story"])
logger = logging.getLogger(__name__)


async def search_story_articles(query: str, n: int = 25) -> list:
    from llm import get_embeddings
    from langchain_chroma import Chroma

    vectorstore = Chroma(
        collection_name="articles_longterm",
        embedding_function=get_embeddings(),
        persist_directory=os.getenv("CHROMA_PATH", "./chroma_store"),
    )

    results = vectorstore.similarity_search_with_relevance_scores(query, k=n)
    filtered = [(doc, score) for doc, score in results if score >= 0.30]
    filtered.sort(key=lambda x: x[1], reverse=True)

    articles = []
    for doc, score in filtered[:n]:
        meta = doc.metadata
        articles.append({
            "id": meta.get("id", ""),
            "title": meta.get("title", ""),
            "summary": meta.get("summary", ""),
            "source": meta.get("source", ""),
            "published_at": meta.get("published_at", ""),
            "url": meta.get("url", ""),
            "topics": json.loads(meta.get("topics", "[]")),
            "content": doc.page_content,
        })

    # Sort by date ascending for timeline
    articles.sort(key=lambda x: x.get("published_at", ""))
    return articles


@router.post("/story-arc", response_model=StoryArcResponse)
async def get_story_arc(
    req: StoryArcRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a story and return a structured arc with timeline, players, sentiment, etc.
    Uses long-term collection for multi-day tracking.
    """
    try:
        # 1. Search long-term collection for relevant articles
        articles = await search_story_articles(req.story_query, n=12)

        if not articles:
            return StoryArcResponse(
                summary="No articles found for this story yet. Try a different search term.",
                articles=[],
            )

        # 2. Use LangChain story arc with structured output parsing
        arc_data = await llm_get_story_arc(req.story_query, articles)

        # 3. Build response — safely parse each field
        timeline = []
        for evt in arc_data.get("timeline", []):
            try:
                timeline.append(TimelineEvent(**evt))
            except Exception:
                pass

        players = []
        for p in arc_data.get("players", []):
            try:
                players.append(Player(**p))
            except Exception:
                pass

        sentiment = []
        for s in arc_data.get("sentiment_over_time", []):
            try:
                sentiment.append(SentimentPoint(**s))
            except Exception:
                pass

        return StoryArcResponse(
            timeline=timeline,
            players=players,
            sentiment_over_time=sentiment,
            contrarian_view=arc_data.get("contrarian_view", ""),
            summary=arc_data.get("summary", ""),
            what_to_watch=arc_data.get("what_to_watch", []),
            articles=[_to_article_response(a) for a in articles[:8]],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Story arc error: {type(e).__name__}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Story arc analysis failed: {type(e).__name__}: {str(e)}")


def _to_article_response(a: dict) -> ArticleResponse:
    return ArticleResponse(
        id=a.get("id", ""),
        title=a.get("title", ""),
        summary=a.get("summary", ""),
        url=a.get("url", ""),
        source=a.get("source", ""),
        published_at=a.get("published_at"),
        topics=a.get("topics", []),
    )
