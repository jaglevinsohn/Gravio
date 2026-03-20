import logging
import datetime
import asyncio
from playwright.async_api import async_playwright
from sqlalchemy.orm import Session
from db.models import SchoologyConnection, Student, Course, Category, Assignment, SyncLog
from auth.encryption import decrypt_cookies
from sync.parsers import parse_students, parse_courses, parse_assignments

logger = logging.getLogger(__name__)

async def run_sync_for_connection(db: Session, connection_id: int):
    """
    Syncs data for a single SchoologyConnection.
    - Decrypts the session cookies
    - Recreates an authenticated Playwright session
    - Runs the parsers (students, courses, assignments)
    - Updates the database
    """
    connection = db.query(SchoologyConnection).filter(SchoologyConnection.id == connection_id).first()
    
    if not connection or connection.connection_status != "active":
        logger.warning(f"Connection {connection_id} is inactive or not found.")
        return

    try:
        # Setup SyncLog immediately so frontend polling knows we started
        sync_log = SyncLog(connection_id=connection.id, status="validating")
        db.add(sync_log)
        db.commit()
        db.refresh(sync_log)

        # 1. Recreate session
        cookies = decrypt_cookies(connection.encrypted_cookies)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            # Normalize cookie SameSite formatting (handles legacy extension cached cookies)
            for c in cookies:
                if 'sameSite' in c:
                    val = c['sameSite'].lower()
                    if val == 'no_restriction':
                        c['sameSite'] = 'None'
                    elif val in ['strict', 'lax', 'none']:
                        c['sameSite'] = val.capitalize()
                    elif val == 'unspecified':
                        c['sameSite'] = 'Lax'
                        
            # Inject the saved cookies
            await context.add_cookies(cookies)
            page = await context.new_page()
            target_domain = "app.schoology.com"
            for c in cookies:
                domain = c.get("domain", "").lstrip('.')
                if "schoology.com" in domain and domain not in ["schoology.com", "app.schoology.com"]:
                    target_domain = domain
                    break

            target_url = f"https://{target_domain}/home"
            
            # Verify the session is still valid
            logger.info(f"Navigating to exact SSO portal: {target_url}")
            await page.goto(target_url, wait_until="domcontentloaded")
            
            actual_url = page.url
            logger.info(f"After navigation, landed on: {actual_url}")
            
            # Handle Google SSO Redirects (e.g. bwscampus)
            if "accounts.google.com" in actual_url:
                logger.info("Detected Google SSO Chooser. Attempting to click school profile...")
                try:
                    # Click the first account listed in the Google SSO chooser
                    await page.locator("div[data-identifier]").first.click(timeout=8000)
                    await page.wait_for_load_state("domcontentloaded")
                    await page.wait_for_timeout(2000) # Give it an extra second to process the login
                    actual_url = page.url
                    logger.info(f"Clicked SSO Profile! URL is now: {actual_url}")
                except Exception as e:
                    logger.error(f"Failed to bypass Google SSO: {e}")

            if ("login" in actual_url and "receive/google_apps" not in actual_url) or "authorize" in actual_url or "accounts.google.com" in actual_url:
                raise Exception(f"Session expired or missing. Redirected to {actual_url}")
            
            # 2. Extract Data
            logger.info("Session valid. Extracting data...")
            sync_log.status = "syncing_courses"
            db.commit()
            
            try:
                parsed_students = await asyncio.wait_for(parse_students(page, target_domain), timeout=30.0)
                parsed_courses = await asyncio.wait_for(parse_courses(page, target_domain), timeout=60.0)
            except asyncio.TimeoutError:
                raise Exception("Timeout while fetching courses from Schoology.")
                
            if len(parsed_courses) == 0:
                raise Exception("Connected successfully, but no courses were found. Sync aborted to prevent false success.")
                
            sync_log.courses_imported = len(parsed_courses)
            sync_log.status = "syncing_assignments"
            db.commit()
            
            # 3. Save to Database
            # (In a real app, this should handle updates to existing records,
            # but for the MVP, we will do simplified upsert logic)
            
            for s_data in parsed_students:
                student = db.query(Student).filter(Student.connection_id == connection.id, Student.external_student_id == s_data["external_student_id"]).first()
                if not student:
                    student = Student(connection_id=connection.id, **s_data)
                    db.add(student)
                    db.flush() # Get student.id
                
                for c_data in parsed_courses:
                    course = db.query(Course).filter(Course.student_id == student.id, Course.external_course_id == c_data["external_course_id"]).first()
                    if not course:
                        course = Course(student_id=student.id, **c_data)
                        db.add(course)
                        db.flush()
                        
                    # Extract assignments for each course
                    try:
                        parsed_assignments, parsed_categories = await asyncio.wait_for(parse_assignments(page, course.external_course_id, target_domain), timeout=90.0)
                    except asyncio.TimeoutError:
                        logger.warning(f"Timeout parsing assignments for course {course.external_course_id}")
                        parsed_assignments, parsed_categories = [], []
                        
                    sync_log.assignments_imported += len(parsed_assignments)
                    
                    # Determine Course Grading Mode
                    valid_types = [a["score_type"] for a in parsed_assignments if a["score_type"] not in ["empty", "status"]]
                    if valid_types:
                        # increment grades found for stats
                        sync_log.grades_imported += len([a for a in parsed_assignments if a.get("score") is not None])
                        db.commit()
                        
                        numeric_count = sum(1 for t in valid_types if t in ["percent", "numeric"])
                        letter_count = sum(1 for t in valid_types if t == "letter")
                        
                        if letter_count > 0 and numeric_count == 0:
                            course.grading_mode = "letter"
                        elif numeric_count > 0 and letter_count == 0:
                            course.grading_mode = "percent"
                        elif letter_count > numeric_count * 2:
                            course.grading_mode = "letter"
                        elif numeric_count > letter_count * 2:
                            course.grading_mode = "percent"
                        else:
                            course.grading_mode = "mixed"
                    else:
                        course.grading_mode = "percent" # Default fallback
                        
                    for a_data in parsed_assignments:
                        assignment = db.query(Assignment).filter(Assignment.course_id == course.id, Assignment.external_assignment_id == a_data["external_assignment_id"]).first()
                        if not assignment:
                            assignment = Assignment(course_id=course.id, **a_data)
                            db.add(assignment)
                    
                    # Upsert Categories
                    for cat_data in parsed_categories:
                        category = db.query(Category).filter(Category.course_id == course.id, Category.name == cat_data["name"]).first()
                        if category:
                            category.weight = cat_data["weight"]
                            category.percentage = cat_data["percentage"]
                        else:
                            category = Category(course_id=course.id, **cat_data)
                            db.add(category)
            
            # 4. Update Success State
            connection.connection_status = "active"
            connection.last_sync_at = datetime.datetime.now()
            sync_log.status = "success"
            db.commit()
            
            logger.info(f"Sync complete for connection {connection_id}.")
            await browser.close()
            
    except Exception as e:
        logger.error(f"Sync failed for connection {connection_id}: {e}")
        db.rollback()
        
        # Mark as reauth required if the session is dead
        if "Session expired" in str(e):
            connection.connection_status = "reauth_required"
            
        try:
            sync_log.status = "failed"
            sync_log.error_message = str(e)
            db.commit()
        except Exception:
            # If sync_log wasn't created yet for some reason
            db.add(SyncLog(connection_id=connection.id, status="failed", error_message=str(e)))
            db.commit()
