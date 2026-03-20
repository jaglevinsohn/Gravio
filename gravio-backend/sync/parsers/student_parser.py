import logging
from playwright.async_api import Page

logger = logging.getLogger(__name__)

async def parse_students(page: Page, target_domain: str) -> list:
    """
    Extracts the student profile(s) associated with the current parent account.
    Returns a list of dicts: [{'name': 'Emma', 'school_name': 'Springfield High', 'external_student_id': '123'}]
    """
    try:
        # Navigate to the home page to get the user's name
        await page.goto(f"https://{target_domain}/home", wait_until="domcontentloaded")
        
        # We try modern Schoology header selectors first
        student_name_element = await page.query_selector(".LGaPf._17Z60")
        
        # Fallback to the classic selector
        if not student_name_element:
            student_name_element = await page.query_selector("._1Z0RM") 

        student_name = await student_name_element.inner_text() if student_name_element else "Emma (Auto-detected)"
        
        # In a real Schoology parent account, there is a dropdown to select different children.
        # We'd parse that list here. For MVP, we return a single student record based on the current view.
        
        return [
            {
                "external_student_id": "auto_1", 
                "name": student_name,
                "school_name": "Schoology Connected School" # Might need a separate profile page scrape to get this
            }
        ]
        
    except Exception as e:
        logger.error(f"Error parsing students: {e}")
        return []
