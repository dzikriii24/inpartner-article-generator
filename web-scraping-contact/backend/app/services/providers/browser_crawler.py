import logging
import os
import sys
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    webdriver = None
    Options = None
    By = None
    WebDriverWait = None
    EC = None

class BrowserCrawler:
    """
    Tier 2 Browser Automation Crawler using Headless Chrome.
    Optimized for shared hosting / CloudLinux:
    - Bypasses headless browser if Selenium is not installed or binary is missing.
    - Prevents NPROC explosion and high RAM consumption on Linux servers.
    """
    def __init__(self, timeout: int = 12):
        self.timeout = timeout
        # Auto-detect Chrome binary if present
        default_win_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if sys.platform == "win32" and os.path.exists(default_win_path):
            self.chrome_binary = default_win_path
        elif os.path.exists("/usr/bin/google-chrome"):
            self.chrome_binary = "/usr/bin/google-chrome"
        elif os.path.exists("/usr/bin/chromium-browser"):
            self.chrome_binary = "/usr/bin/chromium-browser"
        else:
            self.chrome_binary = None

    def _create_driver(self):
        if not SELENIUM_AVAILABLE or not self.chrome_binary:
            return None
        options = Options()
        options.binary_location = self.chrome_binary
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1366,768")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        prefs = {"profile.managed_default_content_settings.images": 2}
        options.add_experimental_option("prefs", prefs)

        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(self.timeout)
        return driver

    def fetch_rendered_page(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Loads URL with headless Chrome if available.
        On shared hosting / headless Linux, safely returns None to prioritize HTTP extraction.
        """
        if not SELENIUM_AVAILABLE or not self.chrome_binary:
            logger.info(f"[BrowserCrawler] Headless Chrome skipped (safe HTTP fallback mode) for {url}")
            return None

        driver = None
        try:
            logger.info(f"[BrowserCrawler] Launching Headless Chrome for {url}")
            driver = self._create_driver()
            if not driver:
                return None
            driver.get(url)

            WebDriverWait(driver, 6).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(1.5)

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
