"""
Vernacular Audio router — POST /story/vernacular-audio
Generates Hindi audio explainer from article content.
Pipeline: Article → TranslationAgent (Ollama) → edge-tts → MP3 stream
"""

import os
import tempfile
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import get_current_user
from database import get_article_by_id, log_agent_action
from agents.translation_agent import translate_to_hindi_script

router = APIRouter(tags=["vernacular"])
logger = logging.getLogger(__name__)

# Directory for cached audio files
AUDIO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)


class VernacularRequest(BaseModel):
    article_id: str


@router.post("/vernacular-audio")
async def generate_vernacular_audio(
    req: VernacularRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate Hindi audio explainer for an article.
    1. Fetch article from DB
    2. TranslationAgent creates Hindi script via Ollama
    3. edge-tts synthesizes speech as MP3
    4. Stream MP3 back to client
    """
    import time
    start = time.time()

    # 1. Fetch article
    article = await get_article_by_id(req.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    title = article.get("title", "")
    content = article.get("content") or article.get("summary", "")
    source = article.get("source", "")

    if not content:
        raise HTTPException(status_code=400, detail="Article has no content")

    # Check cache
    cache_path = os.path.join(AUDIO_CACHE_DIR, f"{req.article_id}_hi.mp3")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        logger.info(f"Serving cached Hindi audio for: {title[:50]}")
        return StreamingResponse(
            open(cache_path, "rb"),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{req.article_id}_hindi.mp3"',
                "Cache-Control": "public, max-age=86400",
            },
        )

    try:
        # 2. Generate Hindi script via TranslationAgent
        logger.info(f"Generating Hindi script for: {title[:50]}")
        hindi_script = await translate_to_hindi_script(title, content, source)

        if not hindi_script or len(hindi_script) < 10:
            raise HTTPException(status_code=500, detail="Hindi script generation failed")

        # 3. Synthesize audio via edge-tts
        logger.info(f"Synthesizing Hindi audio ({len(hindi_script)} chars)")
        import edge_tts

        # Use a natural Hindi voice
        communicate = edge_tts.Communicate(
            text=hindi_script,
            voice="hi-IN-SwaraNeural",  # Female Hindi voice (natural sounding)
            rate="+0%",
            pitch="+0Hz",
        )

        # Write to temp file, then move to cache
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name

        await communicate.save(tmp_path)

        # Move to cache
        os.rename(tmp_path, cache_path)

        duration_ms = int((time.time() - start) * 1000)
        logger.info(f"Hindi audio generated in {duration_ms}ms for: {title[:50]}")

        # Log the action
        await log_agent_action(
            agent_name="VernacularAudioEngine",
            task="vernacular-audio",
            status="success",
            user_id=current_user.get("user_id"),
            input_data={"article_id": req.article_id, "title": title[:60]},
            output_data={"script_length": len(hindi_script), "duration_ms": duration_ms},
            duration_ms=duration_ms,
        )

        # 4. Stream the audio file
        return StreamingResponse(
            open(cache_path, "rb"),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{req.article_id}_hindi.mp3"',
                "Cache-Control": "public, max-age=86400",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vernacular audio error: {type(e).__name__}: {e}")

        await log_agent_action(
            agent_name="VernacularAudioEngine",
            task="vernacular-audio",
            status="failed",
            user_id=current_user.get("user_id"),
            input_data={"article_id": req.article_id},
            error=str(e),
        )

        # Clean up temp files on error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)

        raise HTTPException(
            status_code=500,
            detail=f"Audio generation failed: {type(e).__name__}: {str(e)}"
        )
