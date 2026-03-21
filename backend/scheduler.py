# backend/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_ingestion_graph():
    """Called by scheduler every 30 minutes."""
    from agents.graph import ingest_graph, make_initial_state
    logger.info("[Scheduler] Starting ingestion graph")
    initial_state = make_initial_state(task="ingest")
    final_state = await ingest_graph.ainvoke(initial_state)
    logger.info(
        f"[Scheduler] Ingestion complete — "
        f"{len(final_state['enriched_articles'])} new articles, "
        f"{len(final_state['errors'])} errors"
    )


def start_scheduler():
    scheduler.add_job(
        run_ingestion_graph,
        trigger=IntervalTrigger(minutes=30),
        id="news_ingestion",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=120,
    )
    scheduler.start()
    logger.info("Scheduler started — ingestion graph runs every 30 minutes")