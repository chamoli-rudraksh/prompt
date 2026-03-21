from typing import TypedDict, Optional, List, Any
from datetime import datetime

class AgentState(TypedDict):
    # ── Input ─────────────────────────────────────────
    task: str                    # "ingest" | "feed" | "briefing" | "story"
    user_id: Optional[str]
    query: Optional[str]         # topic for briefing or story arc
    conversation_id: Optional[str]

    # ── Intermediate data ──────────────────────────────
    raw_articles: List[dict]     # from ingestion agent
    enriched_articles: List[dict]# after processing agent
    relevant_articles: List[dict]# after relevance agent

    # ── Outputs ────────────────────────────────────────
    briefing: Optional[str]
    story_arc: Optional[dict]
    feed_articles: List[dict]

    # ── Control flow ───────────────────────────────────
    current_agent: str           # which agent is running now
    retry_count: int             # how many retries have happened
    errors: List[str]            # list of errors encountered
    status: str                  # "running" | "success" | "failed"

    # ── Audit ──────────────────────────────────────────
    logs: List[dict]             # every agent action logged here
