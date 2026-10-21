import base64
import urllib.parse
import logging
from typing import List
import requests
from bs4 import BeautifulSoup
from app.services.providers.base import BaseSearchProvider, SearchResultItem

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

class BingSearchProvider(BaseSearchProvider):
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENTS[0],
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })

    def _decode_bing_url(self, raw_url: str) -> str:
        """Decode Bing redirect URL if applicable."""
        if not raw_url:
            return ""
        try:
            if "bing.com/ck/a?" in raw_url:
                parsed = urllib.parse.urlparse(raw_url)
                params = urllib.parse.parse_qs(parsed.query)
                u_param = params.get("u", [""])[0]
                if u_param:
                    for prefix_len in [2, 0, 1]:
                        try:
                            b64_str = u_param[prefix_len:]
                            b64_str += "=" * ((4 - len(b64_str) % 4) % 4)
                            decoded = base64.urlsafe_b64decode(b64_str).decode("utf-8", errors="ignore")
                            if decoded.startswith("http"):
                                return decoded
                        except Exception:
                            continue
            return raw_url
        except Exception as e:
            logger.debug(f"Error decoding Bing URL {raw_url}: {e}")
            return raw_url

    def search(self, query: str, max_results: int = 5) -> List[SearchResultItem]:
        results = []
        try:
            url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}&cc=ID&setlang=id&mkt=id-ID"
            resp = self.session.get(url, timeout=10)
            if resp.status_code != 200:
                logger.warning(f"Bing search returned status {resp.status_code}")
                return results

            soup = BeautifulSoup(resp.text, "html.parser")
            items = soup.select("li.b_algo")
            
            for rank, li in enumerate(items[:max_results], start=1):
                h2 = li.find("h2")
                a = h2.find("a") if h2 else None
                snippet_el = li.find("div", class_="b_caption") or li.find("p")
                
                if a and a.get("href"):
                    raw_href = a.get("href")
                    target_url = self._decode_bing_url(raw_href)
                    title = a.get_text().strip()
                    snippet = snippet_el.get_text().strip() if snippet_el else ""
                    
                    if target_url and target_url.startswith("http"):
                        results.append(SearchResultItem(
                            title=title,
                            url=target_url,
                            snippet=snippet,
                            source_type="bing_search",
                            rank=rank
                        ))
        except Exception as e:
            logger.error(f"Bing search error for '{query}': {e}")

        return results
