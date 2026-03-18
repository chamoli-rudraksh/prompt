"""
Pydantic models for all request/response bodies.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── User Models ─────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    name: str
    persona: str = Field(..., description="investor | founder | student | professional")
    interests: list[str] = Field(..., description="List of interest topics")


class UserResponse(BaseModel):
    id: str
    name: str
    persona: str
    interests: list[str]
    created_at: Optional[str] = None


# ─── Feed Models ─────────────────────────────────────────────────────────────

class ArticleResponse(BaseModel):
    id: str
    title: str
    summary: str
    url: str
    source: str
    published_at: Optional[str] = None
    topics: list[str] = []
    why_it_matters: Optional[str] = None


class FeedResponse(BaseModel):
    articles: list[ArticleResponse]
    user_name: str
    persona: str


# ─── Navigator Models ───────────────────────────────────────────────────────

class BriefingRequest(BaseModel):
    topic: str
    user_id: str


class SourceInfo(BaseModel):
    title: str
    url: str
    source: str


class BriefingResponse(BaseModel):
    conversation_id: str
    briefing_text: str
    sources: list[SourceInfo]


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    stream: bool = True


class ChatResponse(BaseModel):
    response: str
    sources_used: list[SourceInfo] = []


# ─── Story Arc Models ───────────────────────────────────────────────────────

class StoryArcRequest(BaseModel):
    story_query: str
    user_id: str


class TimelineEvent(BaseModel):
    date: str
    headline: str
    description: str
    sentiment: str
    source: str


class Player(BaseModel):
    name: str
    type: str
    role: str
    connections: list[str] = []


class SentimentPoint(BaseModel):
    date: str
    score: float
    label: str


class StoryArcResponse(BaseModel):
    timeline: list[TimelineEvent] = []
    players: list[Player] = []
    sentiment_over_time: list[SentimentPoint] = []
    contrarian_view: str = ""
    summary: str = ""
    what_to_watch: list[str] = []
    articles: list[ArticleResponse] = []


# ─── Saved Articles ─────────────────────────────────────────────────────────

class SaveArticleRequest(BaseModel):
    user_id: str
    article_id: str


# ─── Error Models ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    fallback: bool = False
    detail: Optional[str] = None
