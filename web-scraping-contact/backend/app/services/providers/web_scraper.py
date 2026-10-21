import logging
import urllib.parse
from typing import Dict, Any, List, Set, Optional
import requests
from bs4 import BeautifulSoup

from app.services.contact_extractor import GroundedContactExtractor
from app.services.providers.browser_crawler import browser_crawler

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
}

COMMON_CONTACT_PATHS = [
    "/contact", "/contact-us", "/contactus", "/kontak", "/hubungi-kami", 
    "/hubungikami", "/HubungiKami", "/hubungi", "/about", "/about-us", 
    "/tentang-kami", "/tentangkami", "/locations", "/lokasi", "/id/contact-us", "/id/hubungi-kami"
]

class WebScraperService:
    def __init__(self, timeout: int = 12):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def scrape_website_contacts(self, base_url: str) -> Dict[str, Any]:
        """
        Deep, grounded crawl of target official website.
        Tier 1: Fast HTTP session crawling homepage, footer, structured JSON-LD, and contact pages.
        Tier 2: Automatic Headless Chrome rendering if page is a client-side SPA or HTTP yield is 0.
        """
        contacts: List[Dict[str, Any]] = []
        page_snippets: List[str] = []
        discovered_urls: Set[str] = set()
        crawled_pages_audit: List[Dict[str, Any]] = []
        used_browser_crawler = False

        if not base_url or not base_url.startswith("http"):
            return {
                "contacts": contacts, 
                "snippets": page_snippets, 
                "pages_scraped": [], 
                "audit": crawled_pages_audit,
                "browser_used": False
            }

        parsed_base = urllib.parse.urlparse(base_url)
        base_domain = parsed_base.netloc.lower()
        root_url = f"{parsed_base.scheme}://{parsed_base.netloc}"

        # 1. Fetch Homepage (HTTP)
        homepage_data = self._fetch_and_parse(base_url, is_contact_page=False)
        if homepage_data:
            discovered_urls.add(base_url)
            contacts.extend(homepage_data["contacts"])
            crawled_pages_audit.append({
                "url": base_url,
                "status_code": homepage_data["status_code"],
                "method": "http",
                "title": homepage_data["title"],
                "contacts_count": len(homepage_data["contacts"])
            })
            if homepage_data["snippet"]:
                page_snippets.append(f"Homepage [{homepage_data['title']}]: {homepage_data['snippet']}")

        # Check if homepage is an empty JavaScript SPA shell or unreachable
        is_spa_shell = False
        if homepage_data:
            raw_html_lower = homepage_data.get("raw_html", "").lower()
            if ('id="root"' in raw_html_lower or 'id="app"' in raw_html_lower or 'id="__next"' in raw_html_lower) and len(homepage_data.get("contacts", [])) == 0:
                is_spa_shell = True

        # Tier 2 Fallback: If HTTP failed or returned 0 contacts with SPA indicators, run BrowserCrawler
        if not homepage_data or is_spa_shell or (len(contacts) == 0 and homepage_data.get("status_code") == 200):
            logger.info(f"Triggering Tier 2 BrowserCrawler for {base_url} (is_spa: {is_spa_shell})")
            rendered = browser_crawler.fetch_rendered_page(base_url)
            if rendered:
                used_browser_crawler = True
                b_soup = BeautifulSoup(rendered["html"], "html.parser")
                b_contacts = self._extract_all_grounded_contacts(
                    b_soup, 
                    source_url=rendered["final_url"] or base_url, 
                    page_title=rendered["title"], 
                    is_contact_page=False, 
                    method_override="browser_automation"
                )
                contacts.extend(b_contacts)
                crawled_pages_audit.append({
                    "url": rendered["final_url"] or base_url,
                    "status_code": 200,
                    "method": "browser_rendered",
                    "title": rendered["title"],
                    "contacts_count": len(b_contacts)
                })
                # If homepage_data wasn't set earlier, extract links from rendered DOM
                if not homepage_data:
                    homepage_data = {
                        "links": [a["href"] for a in b_soup.find_all("a", href=True)],
                        "title": rendered["title"]
                    }

        # 2. Discover Contact and About Subpages
        contact_candidates: List[str] = []
        priority_keywords = ["contact", "kontak", "hubungi", "about", "tentang", "location", "lokasi", "investor", "profile"]

        if homepage_data and homepage_data.get("links"):
            for link in homepage_data["links"]:
                try:
                    full_url = urllib.parse.urljoin(base_url, link)
                    parsed_link = urllib.parse.urlparse(full_url)
                    
                    link_domain = parsed_link.netloc.lower()
                    if link_domain.startswith("www."):
                        link_domain = link_domain[4:]
                    clean_base_domain = base_domain[4:] if base_domain.startswith("www.") else base_domain
                    
                    # Ensure same domain (handles with/without www and subdomains)
                    if link_domain == clean_base_domain or link_domain.endswith("." + clean_base_domain):
                        path_lower = parsed_link.path.lower()
                        # Ignore assets, images, pdfs
                        if any(path_lower.endswith(ext) for ext in [".pdf", ".jpg", ".png", ".jpeg", ".zip", ".mp4"]):
                            continue
                        if any(kw in path_lower for kw in priority_keywords) and full_url not in discovered_urls:
                            contact_candidates.append(full_url)
                            discovered_urls.add(full_url)
                except Exception:
                    continue

        # If no explicit links discovered in homepage navigation, probe standard contact paths
        if len(contact_candidates) < 2:
            for p in COMMON_CONTACT_PATHS:
                probe_url = urllib.parse.urljoin(root_url, p)
                if probe_url not in discovered_urls:
                    contact_candidates.append(probe_url)
                    discovered_urls.add(probe_url)

        # 3. Crawl up to 4 priority contact subpages
        scraped_pages = [base_url]
        for sub_url in contact_candidates[:4]:
            is_contact = any(k in sub_url.lower() for k in ["contact", "kontak", "hubungi"])
            sub_data = self._fetch_and_parse(sub_url, is_contact_page=is_contact)
            
            if sub_data and sub_data.get("status_code") == 200:
                scraped_pages.append(sub_url)
                contacts.extend(sub_data["contacts"])
                crawled_pages_audit.append({
                    "url": sub_url,
                    "status_code": 200,
                    "method": "http",
                    "title": sub_data["title"],
                    "contacts_count": len(sub_data["contacts"])
                })
                if sub_data["snippet"]:
                    page_snippets.append(f"Subpage [{sub_data['title']} - {sub_url}]: {sub_data['snippet']}")

        # 4. Strict Deduplication & Prioritization
        unique_contacts = self._deduplicate_contacts(contacts)

        return {
            "contacts": unique_contacts,
            "snippets": page_snippets,
            "pages_scraped": scraped_pages,
            "audit": crawled_pages_audit,
            "browser_used": used_browser_crawler
        }

    def _fetch_and_parse(self, url: str, is_contact_page: bool = False) -> Optional[Dict[str, Any]]:
        """Fetch URL via HTTP, parse HTML, extract footer, structured JSON-LD, links, and text."""
        try:
            resp = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            if resp.status_code != 200:
                return {"status_code": resp.status_code, "contacts": [], "links": [], "snippet": "", "title": "", "raw_html": ""}

            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return None

            raw_html = resp.text
            soup = BeautifulSoup(raw_html, "html.parser")

            title_elem = soup.find("title")
            page_title = title_elem.get_text(strip=True) if title_elem else ""

            # Extract contacts using GroundedContactExtractor
            contacts = self._extract_all_grounded_contacts(
                soup, 
                source_url=resp.url, 
                page_title=page_title, 
                is_contact_page=is_contact_page,
                method_override="http_html"
            )

            # Collect outgoing links
            links = []
            for a in soup.find_all("a", href=True):
                links.append(a["href"].strip())

            # Generate textual snippet for entity reconciliation
            for s in soup(["script", "style", "noscript", "svg"]):
                s.extract()
            text_snippet = soup.get_text(separator=" ", strip=True)[:600]

            return {
                "status_code": 200,
                "contacts": contacts,
                "links": links,
                "snippet": text_snippet,
                "title": page_title,
                "raw_html": raw_html[:2000]
            }
        except Exception as e:
            logger.debug(f"HTTP fetch error for {url}: {e}")
            return None

    def _extract_all_grounded_contacts(
        self, 
        soup: BeautifulSoup, 
        source_url: str, 
        page_title: str, 
        is_contact_page: bool = False,
        method_override: str = "http_html"
    ) -> List[Dict[str, Any]]:
        """Extract contacts from schema.org JSON-LD and footer/body with full evidence grounding."""
        extracted: List[Dict[str, Any]] = []

        # 1. JSON-LD structured data (highest fidelity)
        json_ld_contacts = GroundedContactExtractor.extract_structured_json_ld(soup, source_url)
        extracted.extend(json_ld_contacts)

        # 2. Footer, <address>, and page contacts
        page_contacts = GroundedContactExtractor.extract_footer_and_page_contacts(
            soup=soup, 
            source_url=source_url, 
            page_title=page_title, 
            is_contact_page=is_contact_page
        )
        if method_override != "http_html":
            for c in page_contacts:
                if c.get("extraction_method") == "html_link":
                    c["extraction_method"] = f"{method_override}_link"
                elif c.get("extraction_method") == "text_phone_matcher":
                    c["extraction_method"] = f"{method_override}_text"

        extracted.extend(page_contacts)
        return extracted

    def _deduplicate_contacts(self, contacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate contacts by normalized identity, prioritizing highest confidence."""
        seen = set()
        unique = []

        # Sort by confidence score descending so highest quality contact wins
        sorted_contacts = sorted(contacts, key=lambda c: c.get("confidence_score", 0.8), reverse=True)

        for c in sorted_contacts:
            key = None
            if c.get("email"):
                key = f"email:{c['email'].lower()}"
            elif c.get("phone"):
                key = f"phone:{c['phone']}"
            elif c.get("url"):
                key = f"url:{c['url'].lower()}"
            elif c.get("address"):
                key = f"address:{c['address'].lower()[:40]}"

            if key and key not in seen:
                seen.add(key)
                unique.append(c)
            elif not key:
                unique.append(c)

        return unique

web_scraper = WebScraperService()
