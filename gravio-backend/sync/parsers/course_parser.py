import logging
from playwright.async_api import Page

logger = logging.getLogger(__name__)

async def parse_courses(page: Page, target_domain: str) -> list:
    """
    Extracts the courses and current grades from Schoology.
    Returns a list of dicts: [{'title': 'Math', 'teacher_name': 'Mrs. Davis', 'current_grade': 88.5, 'letter_grade': 'B+'}]
    """
    try:
        # Navigate to the courses or grades view.
        await page.goto(f"https://{target_domain}/grades/grades", wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(".s-grades-course-item", timeout=10000)
        except Exception as e:
            title = await page.title()
            logger.error(f"CRITICAL TIMEOUT: Could not find course class. URL: {page.url} TITLE: {title}")
        
        # Scrape course cards or the grade table
        courses = []
        course_elements = await page.query_selector_all(".s-grades-course-item")
        
        for element in course_elements:
            # Get title
            title_el = await element.query_selector(".gradebook-course-title a")
            title = await title_el.inner_text() if title_el else "Unknown Course"
            # Schoology adds a visually hidden "Course" text, let's remove it
            title = title.replace("Course", "").strip()
            
            # Get ID from the course-row
            row_el = await element.query_selector(".course-row")
            course_id = await row_el.get_attribute("data-id") if row_el else "unknown"
            
            # Get grade percentage strictly from the top-level course-row
            grade_el = await element.query_selector(".course-row .awarded-grade .rounded-grade")
            if not grade_el:
                grade_el = await element.query_selector(".course-row .awarded-grade")
            
            if grade_el:
                title_attr = await grade_el.get_attribute("title")
                # sometimes the full percentage is in 'title', otherwise fallback to inner text
                grade_text = title_attr if title_attr else await grade_el.inner_text()
            else:
                grade_text = "100"
                
            grade_val = grade_text.replace("%", "").strip()
            try:
                grade = float(grade_val)
            except ValueError:
                grade = 100.0
            
            if grade >= 93:
                letter = "A"
            elif grade >= 90:
                letter = "A-"
            elif grade >= 87:
                letter = "B+"
            elif grade >= 83:
                letter = "B"
            elif grade >= 80:
                letter = "B-"
            elif grade >= 77:
                letter = "C+"
            elif grade >= 73:
                letter = "C"
            elif grade >= 70:
                letter = "C-"
            elif grade >= 67:
                letter = "D+"
            elif grade >= 63:
                letter = "D"
            elif grade >= 60:
                letter = "D-"
            else:
                letter = "F"
            
            courses.append({
                "external_course_id": str(course_id),
                "title": title,
                "teacher_name": "", # Teacher names aren't on the grades page directly
                "current_grade": grade,
                "letter_grade": letter
            })
            
        return courses
        
    except Exception as e:
        logger.error(f"Error parsing courses: {e}")
        return []
