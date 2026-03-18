import asyncio
import logging
from playwright.async_api import async_playwright
from .encryption import encrypt_cookies

logger = logging.getLogger(__name__)

async def connect_schoology_account(username, password) -> str:
    """
    Launches a headless browser to log into Schoology.
    Captures the session cookies and returns them encrypted.
    Raises an exception if login fails.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Using a realistic user agent helps avoid basic bot detection
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            logger.info("Navigating to Schoology login page...")
            await page.goto("https://app.schoology.com/login", wait_until="networkidle")

            # Fill in the credentials
            await page.fill("#edit-mail", username)
            await page.fill("#edit-pass", password)

            logger.info("Submitting credentials...")
            await page.click("#edit-submit")

            # Wait for either successful login or an error message
            # A successful login redirects to the dashboard (e.g. /home or similar url)
            # An error usually shows up in a div with id 'system-messages'
            try:
                # Wait for the home page navigation or an explicit dashboard element
                await page.wait_for_url("**/home**", timeout=10000)
            except Exception:
                # Check if there's an error message on the page
                error_element = await page.query_selector(".messages.error")
                if error_element:
                    error_text = await error_element.inner_text()
                    raise Exception(f"Schoology login failed: {error_text.strip()}")
                else:
                    raise Exception("Schoology login failed: Timeout waiting for dashboard.")

            logger.info("Login successful. Capturing session cookies...")
            cookies = await context.cookies()

            # Ensure we actually have cookies
            if not cookies:
                raise Exception("Login succeeded but no cookies were found.")

            # Encrypt the cookies for storage
            encrypted_cookies = encrypt_cookies(cookies)
            
            return encrypted_cookies

        finally:
            # Clean up the password variable from memory as early as possible
            password = None 
            await browser.close()
