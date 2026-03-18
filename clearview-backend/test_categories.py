import asyncio
from playwright.async_api import async_playwright
from db.database import get_db
from db.models import SchoologyConnection
from auth.encryption import decrypt_cookies

async def test_categories():
    db = next(get_db())
    conn = db.query(SchoologyConnection).first()
    cookies = decrypt_cookies(conn.encrypted_cookies)
    
    clean_cookies = []
    for c in cookies:
        if "sameSite" in c and c["sameSite"] not in ["Strict", "Lax", "None"]:
            del c["sameSite"]
        clean_cookies.append(c)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        await context.add_cookies(clean_cookies)
        page = await context.new_page()
        
        target_domain = "app.schoology.com"
        for c in clean_cookies:
            domain = c.get("domain", "").lstrip('.')
            if "schoology.com" in domain and domain not in ["schoology.com", "app.schoology.com"]:
                target_domain = domain
                break
                
        target_url = f"https://{target_domain}/home"
        print(f"Navigating to {target_url}")
        await page.goto(target_url, wait_until="networkidle")
        
        actual_url = page.url
        print(f"Landed on: {actual_url}")
        
        if "accounts.google.com" in actual_url:
            print("Detected Google SSO Chooser. Attempting to click school profile...")
            try:
                await page.locator("div[data-identifier]").first.click(timeout=8000)
                await page.wait_for_load_state("networkidle")
                await page.wait_for_timeout(2000)
                actual_url = page.url
                print(f"Clicked SSO Profile! URL is now: {actual_url}")
            except Exception as e:
                print(f"Failed to bypass Google SSO: {e}")

        if ("login" in actual_url and "receive/google_apps" not in actual_url) or "authorize" in actual_url or "accounts.google.com" in actual_url:
            print(f"Session expired or missing. Redirected to {actual_url}")
            await browser.close()
            return

        print("Navigating to grades...")
        await page.goto(f"https://{target_domain}/grades/grades", wait_until="networkidle")
            
        await page.wait_for_timeout(2000)
        
        # Expand the first course
        print("Expanding first course...")
        course = await page.query_selector(".s-grades-course-item")
        if course:
            row = await course.query_selector(".course-row")
            if row:
                isExpanded = await row.evaluate("el => el.classList.contains('active') || el.classList.contains('expanded')")
                if not isExpanded:
                    await row.click()
                await page.wait_for_timeout(2000)
                
                # Get category rows
                cat_rows = await course.query_selector_all(".category-row")
                for i, cr in enumerate(cat_rows):
                    html = await cr.evaluate('el => el.outerHTML')
                    print(f"--- Category {i} ---")
                    print(html)
        else:
            print("No courses found on grades page.")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_categories())
