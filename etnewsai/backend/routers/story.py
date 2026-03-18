"""
Story Arc router — POST /story-arc
Generates timeline, player map, sentiment chart, and contrarian view.
"""

import json
import logging

from fastapi import APIRouter, HTTPException

from models.schemas import (
    StoryArcRequest, StoryArcResponse,
    ArticleResponse, TimelineEvent, Player, SentimentPoint,
)
from ingestion import search_articles
from llm import ask_llm, LLMUnavailableError

router = APIRouter(tags=["story"])
logger = logging.getLogger(__name__)


@router.post("/story-arc", response_model=StoryArcResponse)
async def get_story_arc(req: StoryArcRequest):
    """
    Analyze a story and return a structured arc with timeline, players, sentiment, etc.
    """
    try:
        # 1. Search for relevant articles
        articles = await search_articles(req.story_query, n=15)

        if not articles:
            return StoryArcResponse(
                summary="No articles found for this story yet. Try a different search term.",
                articles=[],
            )

        # 2. Sort articles by published_at ascending
        articles.sort(key=lambda a: a.get("published_at", ""), reverse=False)

        # 3. Format articles for LLM prompt
        formatted = _format_articles(articles)

        story_prompt = (
            f"Analyze these news articles about '{req.story_query}' and return a JSON object "
            f"with EXACTLY this structure (return ONLY the JSON, no other text):\n"
            f'{{\n'
            f'  "timeline": [\n'
            f'    {{"date": "YYYY-MM-DD", "headline": "short event title max 8 words",\n'
            f'     "description": "one sentence", "sentiment": "positive|negative|neutral",\n'
            f'     "source": "publication name"}}\n'
            f'  ],\n'
            f'  "players": [\n'
            f'    {{"name": "entity name", "type": "person|company|institution|government",\n'
            f'     "role": "one sentence describing their role in this story",\n'
            f'     "connections": ["name of other player they connect to"]}}\n'
            f'  ],\n'
            f'  "sentiment_over_time": [\n'
            f'    {{"date": "YYYY-MM-DD", "score": 0.7,\n'
            f'     "label": "positive|negative|neutral"}}\n'
            f'  ],\n'
            f'  "contrarian_view": "A 2-3 sentence perspective that challenges the mainstream '\
            f'narrative about this story, based on evidence in the articles",\n'
            f'  "summary": "One paragraph summary of the full story arc so far",\n'
            f'  "what_to_watch": ["specific thing 1", "specific thing 2", "specific thing 3"]\n'
            f'}}\n\n'
            f"ARTICLES:\n{formatted}"
        )

        response_text = await ask_llm(story_prompt)

        # 4. Parse the JSON
        arc_data = _parse_story_json(response_text)

        if arc_data is None:
            # Retry with stricter prompt
            logger.warning("First story arc parse failed, retrying with stricter prompt")
            retry_prompt = (
                f"You MUST return ONLY valid JSON, no markdown, no explanation.\n"
                f"Analyze these articles about '{req.story_query}'.\n"
                f"Return this exact JSON structure:\n"
                f'{{"timeline":[],"players":[],"sentiment_over_time":[],'
                f'"contrarian_view":"","summary":"","what_to_watch":[]}}\n'
                f"Fill each array with relevant data from the articles.\n"
                f"Timeline entries need: date, headline, description, sentiment, source.\n"
                f"Players need: name, type, role, connections.\n"
                f"Sentiment entries need: date, score (0-1), label.\n\n"
                f"ARTICLES:\n{formatted}"
            )
            response_text = await ask_llm(retry_prompt)
            arc_data = _parse_story_json(response_text)

        if arc_data is None:
            # Return partial data with error flag
            return StoryArcResponse(
                summary=f"Unable to fully analyze '{req.story_query}'. Found {len(articles)} related articles.",
                articles=[_to_article_response(a) for a in articles[:8]],
                what_to_watch=["Check back later for a complete analysis"],
            )

        # 5. Build response
        return StoryArcResponse(
            timeline=[TimelineEvent(**evt) for evt in arc_data.get("timeline", [])],
            players=[Player(**p) for p in arc_data.get("players", [])],
            sentiment_over_time=[SentimentPoint(**s) for s in arc_data.get("sentiment_over_time", [])],
            contrarian_view=arc_data.get("contrarian_view", ""),
            summary=arc_data.get("summary", ""),
            what_to_watch=arc_data.get("what_to_watch", []),
            articles=[_to_article_response(a) for a in articles[:8]],
        )

    except LLMUnavailableError:
        raise HTTPException(
            status_code=503,
            detail=json.dumps({"error": "LLM unavailable", "fallback": True}),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Story arc error: {e}")
        raise HTTPException(status_code=500, detail=f"Story arc analysis failed: {str(e)}")


def _parse_story_json(text: str) -> dict | None:
    """Try to parse JSON from LLM response, handling markdown code blocks."""
    text = text.strip()

    # Remove markdown code block if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Try to find JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
        return None
    except json.JSONDecodeError:
        # Try fixing common issues: single quotes → double quotes
        try:
            fixed = text.replace("'", '"')
            data = json.loads(fixed)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        return None


def _format_articles(articles: list[dict]) -> str:
    """Format articles for LLM prompt."""
    parts = []
    for i, a in enumerate(articles, 1):
        content = a.get("content", a.get("summary", ""))
        if len(content) > 800:
            content = content[:800] + "..."
        parts.append(
            f"[Article {i}]\n"
            f"Title: {a.get('title', '')}\n"
            f"Source: {a.get('source', '')}\n"
            f"Date: {a.get('published_at', '')}\n"
            f"Content: {content}\n"
        )
    return "\n---\n".join(parts)


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
