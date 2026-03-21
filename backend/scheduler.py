from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from ingestion import ingest_all_feeds
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(
        ingest_all_feeds,
        trigger=IntervalTrigger(minutes=30),
        id="news_ingestion",
        name="Ingest live news every 30 minutes",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=120,
    )
    scheduler.start()
    logger.info("Scheduler started — news refreshes every 30 minutes")
