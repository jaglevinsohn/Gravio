import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from db.database import SessionLocal
from db.models import SchoologyConnection
from sync.sync_service import run_sync_for_connection

logger = logging.getLogger(__name__)

# Initialize the scheduler
scheduler = AsyncIOScheduler()

async def sync_all_active_connections():
    """
    Iterates through all active connections and triggers a data sync.
    Runs every 30 minutes.
    """
    logger.info("Executing scheduled sync for all active connections...")
    
    db = SessionLocal()
    try:
        active_connections = db.query(SchoologyConnection).filter(SchoologyConnection.connection_status == "active").all()
        
        for conn in active_connections:
            # Recreate session, run Playwright, and extract data
            await run_sync_for_connection(db, conn.id)
            
    except Exception as e:
        logger.error(f"Scheduled sync error: {e}")
    finally:
        db.close()

def start_scheduler():
    """Starts the APScheduler with the defined jobs."""
    scheduler.add_job(sync_all_active_connections, 'interval', minutes=30)
    scheduler.start()
    logger.info("Sync scheduler started.")
