"""
Scheduler — APScheduler background job to refresh news every 30 minutes.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ingestion import ingest_all_feeds

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    """
    Start the background scheduler.
    Runs ingest_all_feeds() immediately on first start, then every 30 minutes.
    """
    scheduler.add_job(
        _run_ingestion,
        "interval",
        minutes=30,
        id="news_ingestion",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started: news ingestion every 30 minutes")


async def _run_ingestion():
    """Wrapper to run ingestion with error handling."""
    try:
        count = await ingest_all_feeds()
        logger.info(f"Scheduled ingestion complete: {count} new articles")
    except Exception as e:
        logger.error(f"Scheduled ingestion failed: {e}")


async def run_initial_ingestion():
    """Run the first ingestion immediately on startup."""
    logger.info("Running initial news ingestion...")
    await _run_ingestion()
