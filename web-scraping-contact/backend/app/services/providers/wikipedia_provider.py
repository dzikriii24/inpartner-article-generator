import re
import logging
from typing import Optional, Dict, Any
import requests

logger = logging.getLogger(__name__)

class WikipediaProvider:
    BASE_URL = "https://id.wikipedia.org/w/api.php"
    HEADERS = {
        "User-Agent": "InpartnerCompanyIntelligence/1.0 (internal-contact-enrichment; contact@inpartner.id)"
    }

    def get_company_data(self, company_name: str) -> Optional[Dict[str, Any]]:
        """Search Wikipedia for company and extract structured infobox & intro."""
        try:
            # 1. Search for title
            params = {
                "action": "query",
                "list": "search",
                "srsearch": company_name,
                "format": "json"
            }
            resp = requests.get(self.BASE_URL, params=params, headers=self.HEADERS, timeout=8)
            if resp.status_code != 200:
                return None
            
            data = resp.json()
            search_results = data.get("query", {}).get("search", [])
            if not search_results:
                return None

            clean_q = re.sub(r'(?i)(\(persero\)|\b(perseroan terbatas|perseroan|terbatas|pt\.?|cv\.?|tbk?\.?|corp\.?|corporation|ltd\.?|inc\.?|group)\b)', '', company_name).strip().lower()
            q_words = [w for w in clean_q.split() if len(w) > 2]

            selected_match = None
            for cand in search_results[:6]:
                cand_title = cand.get("title", "")
                cand_lower = cand_title.lower()
                # Skip broad listing/index pages
                if any(skip in cand_lower for skip in ["daftar ", "indeks ", "kategori:", "indonesia stock exchange"]):
                    continue
                if q_words and any(w in cand_lower for w in q_words):
                    selected_match = cand
                    break

            if not selected_match:
                return None

            title = selected_match.get("title", "")

            # 2. Get parse wikitext & intro extract
            p_params = {
                "action": "query",
                "prop": "extracts|info",
                "inprop": "url",
                "exintro": 1,
                "explaintext": 1,
                "titles": title,
                "format": "json"
            }
            p_resp = requests.get(self.BASE_URL, params=p_params, headers=self.HEADERS, timeout=8)
            p_data = p_resp.json()
            pages = p_data.get("query", {}).get("pages", {})
            if not pages:
                return None

            page_info = list(pages.values())[0]
            wiki_url = page_info.get("fullurl", f"https://id.wikipedia.org/wiki/{title}")
            description = page_info.get("extract", "")

            # 3. Parse infobox for structured data
            info_params = {
                "action": "parse",
                "page": title,
                "prop": "wikitext",
                "format": "json"
            }
            info_resp = requests.get(self.BASE_URL, params=info_params, headers=self.HEADERS, timeout=8)
            wikitext = ""
            if info_resp.status_code == 200:
                wikitext = info_resp.json().get("parse", {}).get("wikitext", {}).get("*", "")

            extracted = self._parse_wikitext(wikitext)
            extracted["title"] = title
            extracted["wikipedia_url"] = wiki_url
            if description and not extracted.get("description"):
                extracted["description"] = description[:500]

            return extracted
        except Exception as e:
            logger.debug(f"Wikipedia lookup error for '{company_name}': {e}")
            return None

    def _parse_wikitext(self, wikitext: str) -> Dict[str, Any]:
        info: Dict[str, Any] = {
            "official_name": None,
            "website": None,
            "industry": None,
            "location": None,
            "city": None,
            "key_people": [],
            "description": None,
        }
        if not wikitext:
            return info

        for line in wikitext.split("\n"):
            line = line.strip()
            if "=" in line and line.startswith("|"):
                parts = line[1:].split("=", 1)
                k = parts[0].strip().lower()
                v = parts[1].strip()
                # Clean wikitext brackets [[...]] and templates {{...}}
                clean_v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', v)
                clean_v = re.sub(r'\{\{[^}]+\}\}', '', clean_v).strip()

                if k in ["name", "nama", "nama_resmi"]:
                    if clean_v and not info["official_name"]:
                        info["official_name"] = clean_v
                elif k in ["website", "situs_web", "situs", "homepage", "url"]:
                    match_url = re.search(r'https?://[^\s\|\}]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', v)
                    if match_url and not info["website"]:
                        url_str = match_url.group(0)
                        if not url_str.startswith("http"):
                            url_str = "https://" + url_str
                        info["website"] = url_str.rstrip('}')
                elif k in ["industry", "industri"]:
                    if clean_v and not info["industry"]:
                        info["industry"] = clean_v
                elif k in ["location", "lokasi", "hq_location"]:
                    if clean_v and not info["location"]:
                        info["location"] = clean_v
                elif k in ["key_people", "tokoh_kunci", "pemimpin"]:
                    if clean_v:
                        info["key_people"].append(clean_v)

        return info
