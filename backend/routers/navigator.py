"""
Navigator router — POST /briefing, POST /chat
RAG-powered deep briefings and interactive follow-up chat.
"""

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import (
    BriefingRequest, BriefingResponse, SourceInfo,
    ChatRequest, ChatResponse,
)
from database import (
    create_conversation, get_conversation,
    append_message, get_articles_by_ids,
)
from ingestion import search_articles
from llm import ask_llm, ask_llm_stream, build_rag_prompt

router = APIRouter(tags=["navigator"])
logger = logging.getLogger(__name__)


@router.post("/briefing", response_model=BriefingResponse)
async def create_briefing(req: BriefingRequest):
    """
    Generate a deep AI briefing on any topic.
    1. Search for relevant articles via ChromaDB
    2. Create a conversation in SQLite
    3. Generate structured briefing via LLM
    4. Return briefing + sources
    """
    try:
        # 1. Search for related articles
        articles = await search_articles(req.topic, n=8)

        if not articles:
            return BriefingResponse(
                conversation_id="",
                briefing_text="No articles found for this topic yet. Try a different search term or wait for more articles to be ingested.",
                sources=[],
            )

        # 2. Store article IDs in a new conversation
        article_ids = [a["id"] for a in articles]
        conv_id = await create_conversation(
            user_id=req.user_id,
            topic=req.topic,
            article_ids=article_ids,
        )

        # 3. Format articles for LLM prompt
        formatted_articles = _format_articles_for_prompt(articles)

        briefing_prompt = (
            f"You are an expert business journalist. Using ONLY the articles provided below, "
            f"create a comprehensive briefing on '{req.topic}' with these exact sections:\n\n"
            f"## Background\n"
            f"(2-3 sentences of context)\n\n"
            f"## What happened\n"
            f"(Bullet points of the 3-5 key developments, each with [Source: name])\n\n"
            f"## Why it matters\n"
            f"(2-3 sentences on the significance)\n\n"
            f"## Key players\n"
            f"(List the main people/companies/institutions involved)\n\n"
            f"## What to watch next\n"
            f"(2-3 specific things to monitor going forward)\n\n"
            f"ARTICLES:\n{formatted_articles}\n\n"
            f"Cite sources as [Source: publication name]. Do not use any knowledge outside "
            f"these articles. If information is insufficient, say so."
        )

        briefing_text = await ask_llm(briefing_prompt)

        # Save the briefing as the first message in conversation
        await append_message(conv_id, "assistant", briefing_text)

        # 4. Build sources list
        sources = [
            SourceInfo(
                title=a.get("title", ""),
                url=a.get("url", ""),
                source=a.get("source", ""),
            )
            for a in articles
        ]

        return BriefingResponse(
            conversation_id=conv_id,
            briefing_text=briefing_text,
            sources=sources,
        )

    except Exception as e:
        logger.error(f"Briefing generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")


@router.post("/chat")
async def chat_follow_up(req: ChatRequest):
    """
    Handle follow-up chat questions about a briefing.
    Supports both streaming and non-streaming responses.
    """
    try:
        # 1. Fetch conversation
        conversation = await get_conversation(req.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # 2. Fetch full articles
        articles = await get_articles_by_ids(conversation["article_ids"])

        # 3. Build prompt with history and articles
        history = conversation.get("messages", [])
        history_str = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in history[-10:]  # Last 10 messages
        )
        formatted_articles = _format_articles_for_prompt(articles)

        chat_prompt = (
            f"You are answering follow-up questions about a news briefing.\n"
            f"Use ONLY the articles provided as your knowledge source.\n"
            f"Cite sources when making specific claims.\n\n"
            f"Previous conversation:\n{history_str}\n\n"
            f"Articles:\n{formatted_articles}\n\n"
            f"User question: {req.message}\n\n"
            f"Provide a clear, well-structured answer:"
        )

        # Save user message
        await append_message(req.conversation_id, "user", req.message)

        if req.stream:
            # 4. Streaming response
            async def generate():
                full_response = []
                try:
                    async for chunk in ask_llm_stream(chat_prompt):
                        full_response.append(chunk)
                        yield f"data: {json.dumps({'text': chunk})}\n\n"
                    yield "data: [DONE]\n\n"
                    # Save complete response to conversation
                    complete = "".join(full_response)
                    await append_message(req.conversation_id, "assistant", complete)
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            # 5. Non-streaming response
            response_text = await ask_llm(chat_prompt)
            await append_message(req.conversation_id, "assistant", response_text)

            sources_used = [
                SourceInfo(title=a["title"], url=a["url"], source=a["source"])
                for a in articles[:5]
            ]
            return ChatResponse(response=response_text, sources_used=sources_used)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


def _format_articles_for_prompt(articles: list[dict]) -> str:
    """Format articles into a clean context block for LLM prompts."""
    parts = []
    for i, a in enumerate(articles, 1):
        content = a.get("content", a.get("summary", ""))
        # Truncate content to avoid excessive tokens
        if len(content) > 800:
            content = content[:800] + "..."
        parts.append(
            f"[Article {i}]\n"
            f"Title: {a.get('title', 'Untitled')}\n"
            f"Source: {a.get('source', 'Unknown')}\n"
            f"Date: {a.get('published_at', 'Unknown')}\n"
            f"Content: {content}\n"
        )
    return "\n---\n".join(parts)
