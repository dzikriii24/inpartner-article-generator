import logging
import time
from typing import Optional, Dict, Any
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

logger = logging.getLogger(__name__)

class BrowserCrawler:
    """
    Tier 2 Browser Automation Crawler using Headless Chrome.
    Used when HTTP scraping encounters JavaScript-rendered single-page apps (React, Next.js, Vue),
    dynamic footers, or anti-bot JS challenges.
    """
    def __init__(self, timeout: int = 12):
        self.timeout = timeout
        self.chrome_binary = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    def _create_driver(self) -> webdriver.Chrome:
        options = Options()
        options.binary_location = self.chrome_binary
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1366,768")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        # Disable images for fast loading
        prefs = {"profile.managed_default_content_settings.images": 2}
        options.add_experimental_option("prefs", prefs)

        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(self.timeout)
        return driver

    def fetch_rendered_page(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Loads URL with headless Chrome, waits for DOM completion and footer rendering,
        and returns full rendered HTML, page title, and final redirected URL.
        """
        driver = None
        try:
            logger.info(f"[BrowserCrawler] Launching Headless Chrome for {url}")
            driver = self._create_driver()
            driver.get(url)

            # Wait for body tag
            WebDriverWait(driver, 6).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            # Give JS scripts 1-2 seconds to mount components and footer
            time.sleep(1.5)

            # Scroll down to trigger lazy-loaded footers
            try:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(0.8)
            except Exception:
                pass

            html = driver.page_source
            title = driver.title
            final_url = driver.current_url

            logger.info(f"[BrowserCrawler] Successfully rendered {url} (HTML length: {len(html)})")
            return {
                "html": html,
                "title": title,
                "final_url": final_url,
                "method": "browser_rendered"
            }
        except Exception as e:
            logger.warning(f"[BrowserCrawler] Failed rendering {url}: {e}")
            return None
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass

browser_crawler = BrowserCrawler()
