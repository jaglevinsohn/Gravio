import asyncio
from sqlalchemy import text
from db.database import SessionLocal
from sync.sync_service import run_sync_for_connection
import dotenv
import logging
import time

dotenv.load_dotenv()
logging.basicConfig(level=logging.INFO)

log = logging.getLogger(__name__)

async def main():
    db = SessionLocal()
    # Force set to active
    log.info("Setting connection to active")
    db.execute(text("UPDATE schoology_connections SET connection_status = 'active' WHERE id = 1"))
    db.commit()
    
    log.info("Starting sync process...")
    await run_sync_for_connection(db, 1)
    log.info("Sync finished")
    
    # check if data made it
    courses = db.execute(text("select id, title, current_grade from courses")).fetchall()
    print("MOCK DATA EXTRACTED COURSES: ")
    for c in courses:
        print(c)
        assigns = db.execute(text(f"select title, submission_status, timeliness_status, grading_status, score from assignments where course_id={c[0]}")).fetchall()
        for a in assigns:
            print(f"  - {a}")

    db.close()

if __name__ == "__main__":
    asyncio.run(main())
