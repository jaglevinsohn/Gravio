import logging
import re
from playwright.async_api import Page
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def classify_score(text: str) -> str:
    if not text or text.strip() in ['--', '']:
        return "empty"
    text = text.strip()
    if '%' in text:
        return "percent"
    if '/' in text or re.match(r'^[\d.]+$', text):
        return "numeric"
    # letters A, A-, B+, etc.
    if re.match(r'^[A-F][+-]?$', text, re.IGNORECASE):
        return "letter"
    # status words
    lower_text = text.lower()
    if lower_text in ['pass', 'incomplete', 'missing', 'exempt', 'fail']:
        return "status"
    return "status" # fallback

async def parse_assignments(page: Page, external_course_id: str, target_domain: str) -> tuple[list, list]:
    """
    Extracts the assignments for a specific course from the grades page.
    Returns a tuple (assignments, categories):
    - assignments: [{'title': 'Math HW', 'due_date': '2026-03-10', 'status': 'missing'}]
    - categories: [{'name': 'Homework', 'weight': 20.0, 'percentage': 89.5}]
    """
    try:
        # We should already be on the grades page from parsing courses, but verify:
        if "grades/grades" not in page.url:
            await page.goto(f"https://{target_domain}/grades/grades", wait_until="domcontentloaded")
            
        try:
            await page.wait_for_selector(f"#s-js-gradebook-course-{external_course_id}", timeout=10000)
        except Exception:
            pass
        
        # Scrape the assignment list
        assignments = []
        categories = []
        course_container = await page.query_selector(f"#s-js-gradebook-course-{external_course_id}")
        if not course_container:
            return [], []
            
        # Recursive expansion wrapper - much faster via Page.evaluate
        async def expand_all():
            expanded_something = await page.evaluate(f'''() => {{
                let expanded = false;
                const container = document.querySelector("#s-js-gradebook-course-{external_course_id}");
                if (!container) return false;
                const rows = container.querySelectorAll(".period-row, .folder-row, .category-row");
                rows.forEach(row => {{
                    const isExpanded = row.classList.contains('active') || row.classList.contains('expanded') || row.getAttribute('aria-expanded') === 'true';
                    if (!isExpanded) {{
                        row.click();
                        expanded = true;
                    }}
                }});
                return expanded;
            }}''')
            if expanded_something:
                await page.wait_for_timeout(1000) # Wait 1 second for any AJAX calls to finish
            return expanded_something
        
        # Keep expanding until everything is open
        for _ in range(5):
            if not await expand_all():
                break
                
        # Scroll to bottom incrementally to trigger lazy load
        await page.evaluate('''async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 100;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if(totalHeight >= scrollHeight - window.innerHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }''')
            
        # --- NEW CATEGORY PARSER ---
        cat_rows = await course_container.query_selector_all(".category-row")
        seen_cat_names = set()
        for cr in cat_rows:
            try:
                title_el = await cr.query_selector(".title-column .title")
                if not title_el:
                    title_el = await cr.query_selector(".title")
                
                title_text = await title_el.text_content() if title_el else ""
                
                weight = None
                name = title_text.strip()
                m_weight = re.search(r'\(([\d.]+)%\)', title_text)
                if m_weight:
                    try:
                        weight = float(m_weight.group(1))
                        name = title_text[:m_weight.start()].strip()
                    except ValueError:
                        pass
                
                # Some Schoology layouts append visually hidden "Category" text
                if name.lower().endswith("category"):
                    name = name[:-8].strip()
                
                grade_el = await cr.query_selector(".rounded-grade")
                if not grade_el:
                    grade_el = await cr.query_selector(".awarded-grade")
                
                percentage = None
                if grade_el:
                    grade_attr = await grade_el.get_attribute("title")
                    grade_text = grade_attr if grade_attr else await grade_el.text_content()
                    if grade_text:
                        m_grade = re.search(r'([\d.]+)', grade_text)
                        if m_grade:
                            try:
                                percentage = float(m_grade.group(1))
                            except ValueError:
                                pass
                
                if name and name not in seen_cat_names:
                    seen_cat_names.add(name)
                    categories.append({
                        "name": name,
                        "weight": weight,
                        "percentage": percentage
                    })
            except Exception as e:
                logger.warning(f"Failed to parse a category for course {external_course_id}: {e}")

        # --- ASSIGNMENT PARSER ---
        item_rows = await course_container.query_selector_all(".item-row")
        
        seen = set()
        
        for element in item_rows:
            # ID
            row_id = await element.get_attribute("data-id")
            external_assignment_id = row_id.replace("I-", "") if row_id else "unknown"
            
            # Title
            title_el = await element.query_selector(".title")
            title = await title_el.text_content() if title_el else "Unknown Assignment"
            # Strip extra whitespace and note hidden text
            title = title.replace("\n", " ").strip()
            
            # Remove redundant suffixes caused by screen-reader text inside the anchor
            suffixes_to_remove = ["assignment", "external-tool-link", "discussion", "assessment"]
            for suffix in suffixes_to_remove:
                if title.lower().endswith(suffix):
                    # use case-insensitive replacement from the end
                    title = title[:-len(suffix)].strip()
            
            # Due Date
            due_date_el = await element.query_selector(".due-date")
            due_date_raw = await due_date_el.text_content() if due_date_el else ""
            due_date_str = due_date_raw.replace("Due", "").strip() if due_date_raw else ""
            
            # Convert to ISO format if possible
            due_date = ""
            if due_date_str:
                from dateutil import parser as date_parser
                try:
                    # Clean up random weekdays like "Friday, "
                    clean_date = re.sub(r'^[a-zA-Z]+,\s*', '', due_date_str)
                    
                    # If it's just a time like "11:59 pm"
                    if re.match(r'^\d{1,2}:\d{2}\s*[a|p]m$', clean_date, re.IGNORECASE):
                        from datetime import date
                        clean_date = f"{date.today().strftime('%B %d')} {clean_date}"
                    
                    parsed_dt = date_parser.parse(clean_date, fuzzy=True)
                    
                    # If it parses but has 1900 as year (missing year in string), use current year
                    if str(parsed_dt.year) not in clean_date and parsed_dt.year < 2000:
                        from datetime import date
                        parsed_dt = parsed_dt.replace(year=date.today().year)
                        
                    due_date = parsed_dt.isoformat()
                except Exception as e:
                    logger.warning(f"Failed to parse date string '{due_date_str}': {e}")
                    due_date = due_date_str # Fallback simply to the string or empty
            
            dedup_key = f"{external_course_id}_{title}_{due_date}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)
            
            # --- NEW ASSIGNMENT STATE LOGIC ---
            
            # 1. Submission State ("not_submitted", "submitted", "resubmitted")
            # 2. Grading State ("ungraded", "graded")
            # 3. Timeliness State ("upcoming", "on_time", "overdue", "late_submitted")
            # 4. Submitted At (datetime string)
            
            submission_status = "not_submitted"
            grading_status = "ungraded"
            timeliness_status = "upcoming"
            submitted_at_str = None
            
            # --- Extract DOM Elements ---
            grade_el = await element.query_selector(".rounded-grade, .awarded-grade, .rubric-grade, .score-value")
            missing_el = await element.query_selector(".exception-icon.missing")
            excused_el = await element.query_selector(".exception-icon.excused")
            
            # Schoology sometimes has .submission-status or text like "1 submission", "Assignment submitted"
            # It also has "On time" or "Late" text sometimes. Since the provided HTML snippets were limited,
            # we will utilize DOM classes like '.has-submissions' or check text content if available.
            # However, typically Schoology puts submission indicators within `.item-row` description or a specific icon.
            
            # For this parser, we fall back to attempting to detect if a grade exists, or if it explicitly says missing.
            # *Crucial Rule Implementation*: 
            # If we see a missing icon, it wasn't submitted and past due.
            # If we don't see a missing icon but time is past due, it's overdue.
            # If we have a grade, it might have been submitted (unless excused/missing).
            
            # Since Schoology's exact submission time might be on the assignment *detail* page, 
            # we do our best approximation from the list view.
            
            grade_text_out = None
            score = None
            max_score = 100.0
            
            # Parse Grades
            if grade_el:
                grading_status = "graded"
                grade_text_val = await grade_el.get_attribute("title") or await grade_el.text_content() or "0"
                grade_text_out = str(grade_text_val).strip()
                try:
                    score = float(grade_text_val)
                except ValueError:
                    pass
                    
            max_grade_el = await element.query_selector(".max-grade")
            if max_grade_el:
                max_text = await max_grade_el.text_content()
                try:
                    max_score = float(re.sub(r"[^\d.]", "", max_text))
                except ValueError:
                    pass
            
            # Determine Submission Status
            # In Schoology list view, if a grade exists (and it's not a 0 tagged as missing), it usually implies submitted.
            # If it has a pending icon, it might be submitted but ungraded. 
            pending_el = await element.query_selector(".grade-pending-icon")
            
            if pending_el or grading_status == "graded":
                submission_status = "submitted"
            elif missing_el:
                submission_status = "not_submitted"
            elif excused_el:
                # Treat excused roughly like submitted so it doesn't show as overdue
                submission_status = "submitted"
                
            # Determine Timeliness
            now = datetime.now()
            is_past_due = False
            if due_date:
                try:
                    from dateutil import parser as date_parser
                    parsed_due = date_parser.parse(due_date)
                    if now > parsed_due:
                        is_past_due = True
                except Exception:
                    pass

            if submission_status == "submitted":
                # We can't know for sure if it was late from the list view without text scraping,
                # but we categorize it as on_time for now unless we see "Late" text.
                # A refined scraper would parse "Submitted late" text here.
                item_text = await element.text_content() or ""
                if "late" in item_text.lower():
                    timeliness_status = "late_submitted"
                else:
                    timeliness_status = "on_time"
            else: # not_submitted
                 if is_past_due or missing_el:
                     timeliness_status = "overdue"
                 else:
                     timeliness_status = "upcoming"

            assignments.append({
                "external_assignment_id": str(external_assignment_id),
                "title": title,
                "due_date": due_date,
                "submission_status": submission_status,
                "grading_status": grading_status,
                "timeliness_status": timeliness_status,
                "submitted_at": submitted_at_str,
                "score": score,
                "grade_text": grade_text_out,
                "score_type": classify_score(grade_text_out),
                "max_score": max_score,
                "category": "Assignment"
            })
            
        return assignments, categories
        
    except Exception as e:
        logger.error(f"Error parsing assignments for {external_course_id}: {e}")
        return [], []
