import re
import json
import logging
import urllib.parse
import time
import warnings
import concurrent.futures
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Tuple

warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")
warnings.filterwarnings("ignore", category=UserWarning, module="google.genai")
warnings.filterwarnings("ignore", message=".*Unverified HTTPS request.*")

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

try:
    from ddgs import DDGS
except Exception:
    try:
        from duckduckgo_search import DDGS
    except Exception:
        DDGS = None

from app.core.config import settings
from app.core.dns_fallback import install_dns_fallback
install_dns_fallback()

from app.models.schema import Company, CompanyProfessional, DiscoveryJob
from app.services.role_classifier import role_classifier
from app.services.company_matcher import CompanyMatcher
from app.services.providers.gemini_ai import GeminiAIService
from app.services.providers.wikipedia_provider import WikipediaProvider

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
}

LEADERSHIP_PATHS = [
    "/governance", "/dewan-direksi", "/board-of-directors", "/management", "/manajemen",
    "/about/company-structure", "/about/management", "/about-us/management",
    "/about-us/board-of-directors", "/tentang-kami/dewan-direksi", "/tentang-kami/manajemen",
    "/our-team", "/tim-kami", "/struktur-organisasi", "/career", "/karir",
    "/about", "/tentang-kami"
]


class StageTracker:
    """Tracks discovery stages with timing and status."""
    
    STAGES = [
        ("resolving_company", "Resolving company identity"),
        ("finding_website", "Finding official website sources"),
        ("searching_sources", "Searching public sources"),
        ("discovering_candidates", "Discovering HR & leadership candidates"),
        ("verifying_professionals", "Verifying professional information"),
        ("saving_results", "Saving results"),
    ]
    
    def __init__(self):
        self.stages: List[Dict[str, Any]] = []
        self._current_idx = 0
        self._stage_start: Optional[float] = None
    
    def start_stage(self, stage_id: str, message: str = ""):
        self._stage_start = time.time()
        self.stages.append({
            "stage": stage_id,
            "status": "RUNNING",
            "duration_ms": 0,
            "message": message or dict(self.STAGES).get(stage_id, stage_id)
        })
    
    def complete_stage(self, message: str = ""):
        if self.stages:
            elapsed = int((time.time() - (self._stage_start or time.time())) * 1000)
            self.stages[-1]["status"] = "COMPLETED"
            self.stages[-1]["duration_ms"] = elapsed
            if message:
                self.stages[-1]["message"] = message
    
    def fail_stage(self, message: str = ""):
        if self.stages:
            elapsed = int((time.time() - (self._stage_start or time.time())) * 1000)
            self.stages[-1]["status"] = "FAILED"
            self.stages[-1]["duration_ms"] = elapsed
            if message:
                self.stages[-1]["message"] = message
    
    def skip_stage(self, stage_id: str, message: str = ""):
        self.stages.append({
            "stage": stage_id,
            "status": "SKIPPED",
            "duration_ms": 0,
            "message": message
        })
    
    def to_json(self) -> str:
        return json.dumps(self.stages, default=str)
    
    @property
    def current_stage(self) -> Optional[str]:
        for s in reversed(self.stages):
            if s["status"] == "RUNNING":
                return s["stage"]
        return None


class ProfessionalDiscoveryService:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.ai = GeminiAIService()
        self._ddgs_client = None

    def _get_ddgs(self) -> Optional[Any]:
        """Get or create DuckDuckGo search client."""
        if DDGS is None:
            return None
        if self._ddgs_client is None:
            try:
                self._ddgs_client = DDGS(timeout=6)
            except Exception:
                return None
        return self._ddgs_client

    def _search_ddgs(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """Search using DuckDuckGo — primary search provider."""
        client = self._get_ddgs()
        if not client:
            return []
        try:
            results = list(client.text(query, max_results=max_results))
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                }
                for r in results
            ]
        except Exception as e:
            logger.debug(f"DDGS search failed for '{query[:50]}': {e}")
            return []

    def discover_professionals(
        self,
        company_name: str,
        website: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        db: Optional[Session] = None,
        company_id: Optional[int] = None,
        job_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Multi-source discovery of HR & Decision Makers with stage tracking.
        """
        started_at = datetime.utcnow()
        start_time = time.time()
        clean_name = CompanyMatcher.clean_company_name(company_name)
        logger.info(f"[ProfDiscovery] Starting for: '{company_name}' (clean: '{clean_name}')")

        tracker = StageTracker()
        raw_candidates: List[Dict[str, Any]] = []
        sources_status: Dict[str, Any] = {}
        
        # Update job status if tracking
        if db and job_id:
            self._update_job(db, job_id, status="RUNNING", current_stage="resolving_company",
                           stages_detail=tracker.to_json(), started_at=started_at)

        # ----- STAGE 1: Wikipedia -----
        tracker.start_stage("resolving_company", "Extracting leadership from Wikipedia")
        wiki_candidates, wiki_audit = self._extract_from_wikipedia(company_name, clean_name)
        raw_candidates.extend(wiki_candidates)
        sources_status["wikipedia"] = {
            "status": "SUCCESS" if wiki_candidates else "NO_DATA",
            "candidates": len(wiki_candidates)
        }
        if wiki_candidates:
            tracker.complete_stage(f"Found {len(wiki_candidates)} people from Wikipedia")
        else:
            tracker.complete_stage("No leadership data in Wikipedia")
        
        if db and job_id:
            self._update_job(db, job_id, current_stage="finding_website", stages_detail=tracker.to_json())

        # ----- STAGE 2: Official Website Leadership Pages -----
        tracker.start_stage("finding_website", "Crawling official website leadership pages")
        if website:
            web_candidates, web_audit = self._crawl_company_leadership_pages(website, company_name)
            raw_candidates.extend(web_candidates)
            sources_status["official_website"] = {
                "status": "SUCCESS" if web_candidates else "NO_LEADERSHIP_PAGES",
                "candidates": len(web_candidates),
                "pages_checked": len(web_audit)
            }
            if web_candidates:
                tracker.complete_stage(f"Found {len(web_candidates)} people from official website")
            else:
                tracker.complete_stage("No leadership pages found on website")
        else:
            tracker.skip_stage("finding_website", "No official website available")
            sources_status["official_website"] = {"status": "SKIPPED", "candidates": 0}

        if db and job_id:
            self._update_job(db, job_id, current_stage="searching_sources", stages_detail=tracker.to_json())

        # ----- STAGE 3: Public Web Search -----
        tracker.start_stage("searching_sources", "Searching public sources for HR & leadership")
        search_candidates, search_audit = self._public_web_search_discovery(company_name, clean_name, website)
        raw_candidates.extend(search_candidates)
        sources_status["public_search"] = {
            "status": "SUCCESS" if search_candidates else "NO_RESULTS",
            "candidates": len(search_candidates)
        }
        if search_candidates:
            tracker.complete_stage(f"Found {len(search_candidates)} candidates from public search")
        else:
            tracker.complete_stage("No candidates from public search")

        if db and job_id:
            self._update_job(db, job_id, current_stage="discovering_candidates", stages_detail=tracker.to_json())

        # ----- STAGE 4: AI Synthesis -----
        tracker.start_stage("discovering_candidates", "AI-assisted candidate extraction")
        ai_candidates = self._grounded_ai_extraction(company_name, wiki_audit + search_audit)
        raw_candidates.extend(ai_candidates)
        if ai_candidates:
            sources_status["ai_synthesis"] = {"status": "SUCCESS", "candidates": len(ai_candidates)}
            tracker.complete_stage(f"AI identified {len(ai_candidates)} additional candidates")
        else:
            sources_status["ai_synthesis"] = {"status": "NO_ADDITIONAL", "candidates": 0}
            tracker.complete_stage("No additional candidates from AI")

        if db and job_id:
            self._update_job(db, job_id, current_stage="verifying_professionals", stages_detail=tracker.to_json())

        # ----- STAGE 5: Classification & Deduplication -----
        tracker.start_stage("verifying_professionals", "Classifying and deduplicating candidates")
        classified = self._merge_and_deduplicate(raw_candidates, company_name)
        tracker.complete_stage(f"{len(classified)} unique professionals after deduplication")

        # ----- STAGE 6: Save -----
        tracker.start_stage("saving_results", "Saving to database")
        if db and company_id:
            self._persist_professionals_to_db(db, company_id, classified)
            tracker.complete_stage(f"Saved {len(classified)} professionals")
        else:
            tracker.skip_stage("saving_results", "No database session")

        # Finalize
        duration = round(time.time() - start_time, 2)
        completed_at = datetime.utcnow()
        
        # Calculate summary
        total_sources_ok = sum(1 for s in sources_status.values() if s.get("status") == "SUCCESS")
        total_sources_fail = sum(1 for s in sources_status.values() if s.get("status") in ["FAILED", "CONNECTION_FAILED"])

        # Determine final status
        if len(classified) > 0:
            final_status = "COMPLETED" if total_sources_fail == 0 else "PARTIAL_SUCCESS"
        elif total_sources_fail > 0:
            final_status = "FAILED"
        else:
            final_status = "COMPLETED"  # No failures, just no candidates found

        # Department and seniority breakdown
        dept_counts: Dict[str, int] = {}
        seniority_counts: Dict[str, int] = {}
        for p in classified:
            dept = p.get("department", "Other")
            sen = p.get("seniority_level", "Staff")
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            seniority_counts[sen] = seniority_counts.get(sen, 0) + 1

        result = {
            "company_name": company_name,
            "company_id": company_id,
            "status": final_status,
            "total_found": len(classified),
            "total_candidates_raw": len(raw_candidates),
            "department_breakdown": dept_counts,
            "seniority_breakdown": seniority_counts,
            "sources_status": sources_status,
            "stages": tracker.stages,
            "duration_seconds": duration,
            "professionals": classified,
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat()
        }

        # Update discovery job final status
        if db and job_id:
            self._update_job(
                db, job_id,
                status=final_status,
                current_stage=None,
                stages_detail=tracker.to_json(),
                total_candidates_raw=len(raw_candidates),
                total_candidates_unique=len(classified),
                total_verified=sum(1 for p in classified if p.get("verification_status") == "VERIFIED"),
                sources_succeeded=total_sources_ok,
                sources_failed=total_sources_fail,
                duration_seconds=duration,
                completed_at=completed_at
            )

        logger.info(f"[ProfDiscovery] Done '{company_name}': {len(classified)} found in {duration}s [{final_status}]")
        return result

    def _update_job(self, db: Session, job_id: int, **kwargs):
        """Update discovery job record."""
        try:
            job = db.query(DiscoveryJob).filter(DiscoveryJob.id == job_id).first()
            if job:
                for key, val in kwargs.items():
                    if hasattr(job, key):
                        setattr(job, key, val)
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            logger.warning(f"Failed to update discovery job {job_id}: {e}")

    def _extract_from_wikipedia(self, company_name: str, clean_name: str) -> Tuple[List[Dict], List[Dict]]:
        """Extract leadership from Wikipedia Infobox."""
        candidates, audit = [], []
        try:
            wiki = WikipediaProvider()
            wiki_data = wiki.get_company_data(clean_name or company_name)
            
            if not wiki_data or not wiki_data.get("key_people"):
                return candidates, audit

            wiki_url = wiki_data.get("wikipedia_url") or "https://id.wikipedia.org"
            audit.append({
                "source": "wikipedia_infobox",
                "url": wiki_url,
                "title": wiki_data.get("title", f"{company_name} - Wikipedia"),
                "key_people_raw": wiki_data.get("key_people", [])
            })

            for kp in wiki_data.get("key_people", []):
                lines = re.split(r'<br\s*/?>\n', kp)
                current_name = None
                for line in lines:
                    cleaned = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>\<[^>]+>', '', line).strip()
                    if not cleaned:
                        continue
                    m_title = re.search(r'\((.*?)\)', cleaned)
                    if m_title and current_name:
                        title = m_title.group(1).strip()
                        cls = role_classifier.classify_role(title)
                        if cls["is_match"]:
                            candidates.append(self._make_candidate(
                                current_name, title, cls, wiki_url,
                                "wikipedia_infobox", "VERIFIED", 0.95,
                                f"Wikipedia Infobox: {current_name} ({title})"
                            ))
                        current_name = None
                    else:
                        if '(' in cleaned and ')' in cleaned:
                            parts = re.findall(r'^(.*?)\s*\((.*?)\)', cleaned)
                            if parts:
                                p_name, p_title = parts[0][0].strip(), parts[0][1].strip()
                                cls = role_classifier.classify_role(p_title)
                                if cls["is_match"]:
                                    candidates.append(self._make_candidate(
                                        p_name, p_title, cls, wiki_url,
                                        "wikipedia_infobox", "VERIFIED", 0.95,
                                        f"Wikipedia Infobox: {p_name} ({p_title})"
                                    ))
                        else:
                            current_name = cleaned
        except Exception as e:
            logger.warning(f"Wikipedia extraction error: {e}")
        return candidates, audit

    def _crawl_company_leadership_pages(self, base_url: str, company_name: str) -> Tuple[List[Dict], List[Dict]]:
        """Crawl company website for leadership/governance pages in parallel."""
        candidates, audit = [], []
        visited: Set[str] = set()

        parsed = urllib.parse.urlparse(base_url)
        base_domain = f"{parsed.scheme}://{parsed.netloc}"
        
        discovered_paths = list(LEADERSHIP_PATHS)
        
        # Discover links from homepage
        try:
            hp_resp = self.session.get(base_url, timeout=settings.PAGE_FETCH_TIMEOUT, verify=False)
            if hp_resp.status_code in [401, 403]:
                audit.append({"url": base_url, "status_code": hp_resp.status_code, "note": "Access denied/WAF"})
                return candidates, audit
            if hp_resp.status_code == 200:
                soup = BeautifulSoup(hp_resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a.get("href", "").strip()
                    if not href or href.startswith("#") or href.startswith("javascript:"):
                        continue
                    full_u = urllib.parse.urljoin(base_url, href)
                    p_u = urllib.parse.urlparse(full_u)
                    if p_u.netloc.lower() == parsed.netloc.lower():
                        path_lower = p_u.path.lower()
                        if any(k in path_lower for k in [
                            "governance", "board", "direk", "manag", "lead", "struktur",
                            "team", "tim", "people", "culture", "career", "karir", "tentang", "about"
                        ]):
                            if p_u.path not in discovered_paths:
                                discovered_paths.insert(0, p_u.path)
        except Exception as e:
            logger.warning(f"Error fetching homepage {base_url}: {e}")

        # Gather target URLs to crawl (limit to MAX_LEADERSHIP_PAGES)
        urls_to_check: List[Tuple[str, str]] = []
        for path in discovered_paths[:settings.MAX_LEADERSHIP_PAGES]:
            target_url = urllib.parse.urljoin(base_domain, path)
            if target_url not in visited:
                visited.add(target_url)
                urls_to_check.append((target_url, path))

        def _fetch_and_parse(target_url: str, path: str):
            try:
                resp = self.session.get(target_url, timeout=settings.PAGE_FETCH_TIMEOUT, verify=False)
                if resp.status_code != 200 or len(resp.text) < 150:
                    return None, {"url": target_url, "status_code": resp.status_code, "source": "official_website_crawl"}

                soup = BeautifulSoup(resp.text, "html.parser")
                page_title = soup.title.string.strip() if soup.title and soup.title.string else path
                extracted = self._parse_personnel_from_html(soup, target_url, page_title, company_name)
                return extracted, {
                    "url": target_url, "title": page_title,
                    "status_code": resp.status_code,
                    "extracted_count": len(extracted),
                    "source": "official_website_crawl"
                }
            except Exception as e:
                return None, {"url": target_url, "error": str(e), "source": "official_website_crawl"}

        # Fetch in parallel with ThreadPoolExecutor (max 2 workers to conserve CloudLinux resources)
        if urls_to_check:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_to_url = {executor.submit(_fetch_and_parse, u, p): u for u, p in urls_to_check}
                for future in concurrent.futures.as_completed(future_to_url):
                    extracted, audit_item = future.result()
                    if extracted:
                        candidates.extend(extracted)
                    if audit_item:
                        audit.append(audit_item)

        return candidates, audit

    def _parse_personnel_from_html(self, soup: BeautifulSoup, source_url: str, page_title: str, company_name: str) -> List[Dict]:
        """Extract personnel from HTML using bio patterns, card structures, and heading-sibling pairs."""
        people = []
        page_text = soup.get_text()

        # Pattern 1: Indonesian corporate bio sentences
        bio_pattern = re.compile(
            r'([A-Z][a-zA-Z\.\s]{2,40}?)\s+(?:diangkat|ditunjuk|menjabat|merupakan|bertindak)\s+(?:menjadi|sebagai)?\s+([A-Za-z\s]{4,50}?)(?:\s+berdasarkan|\s+pada|\s+sejak|\s+sejak tahun|\.|\,)',
            re.IGNORECASE
        )

        INVALID_NAMES = {
            "sebelum", "setelah", "selain", "adapun", "berdasarkan", "sementara", "sebagai",
            "dalam", "untuk", "pada", "sejak", "saat", "ketika", "kemudian", "lalu",
            "beliau", "dia", "ia", "warga", "negara", "indonesia", "informasi", "profil", "daftar",
            "audit", "internal", "sekretaris", "komite", "pedoman", "kebijakan", "tata", "kelola"
        }

        for match in bio_pattern.finditer(page_text):
            raw_name = match.group(1).strip()
            raw_title = match.group(2).strip()

            clean_name = re.sub(r'^(Beliau|Ia|Dia|Warga negara|Bapak|Ibu|Ir\.?|Drs\.?)\s+', '', raw_name, flags=re.IGNORECASE).strip()
            if len(clean_name) < 3 or len(clean_name.split()) > 5:
                continue
            if clean_name.split()[0].lower() in INVALID_NAMES:
                continue

            clean_title = re.sub(r'(?i)\s+menggantikan.*$', '', raw_title).strip()
            clean_title = re.sub(r'(?i)\s+pt\s+.*$', '', clean_title).strip()

            cls = role_classifier.classify_role(clean_title)
            if cls["is_match"] and cls["relevance_score"] >= 0.50:
                evidence = page_text[max(0, match.start()-20):min(len(page_text), match.end()+100)].strip().replace('\n', ' ')
                evidence = re.sub(r'\s+', ' ', evidence)
                people.append(self._make_candidate(
                    clean_name, clean_title.title(), cls, source_url,
                    "official_website", "VERIFIED", 0.95, evidence,
                    page_title=page_title, method="website_governance_parser"
                ))

        # Pattern 2: Card structures
        card_selectors = [
            ".team-member", ".member", ".card-person", ".director", ".board-member",
            ".executive", ".leader", ".person-card", ".governance-item", ".col-md-4", ".col-lg-3"
        ]
        for sel in card_selectors:
            for card in soup.select(sel):
                name_el = card.find(["h2", "h3", "h4", "h5", "strong", "b"])
                title_el = card.find(["p", "span", "div", "em", "h6"], class_=re.compile(r'title|position|role|jabatan', re.I)) or card.find("p")
                if name_el and title_el and name_el != title_el:
                    c_name = name_el.get_text().strip()
                    c_title = title_el.get_text().strip()
                    if 3 <= len(c_name) <= 40 and 1 <= len(c_name.split()) <= 5 and 3 <= len(c_title) <= 60:
                        cls = role_classifier.classify_role(c_title)
                        if cls["is_match"]:
                            people.append(self._make_candidate(
                                c_name, c_title, cls, source_url,
                                "official_website", "VERIFIED", 0.95,
                                f"{c_name} - {c_title} pada halaman {page_title}",
                                page_title=page_title, method="website_card_extractor"
                            ))

        # Pattern 3: Heading + immediate sibling title (standard Indonesian corporate pages)
        seen_names = {p["person_name"].lower() for p in people}
        for heading in soup.find_all(["h2", "h3", "h4"]):
            name = heading.get_text().strip()
            clean_name = re.sub(r'^(Beliau|Ia|Dia|Warga negara|Bapak|Ibu|Ir\.?|Drs\.?)\s+', '', name, flags=re.IGNORECASE).strip()
            if not (3 <= len(clean_name) <= 40 and 1 <= len(clean_name.split()) <= 5):
                continue
            first_w = clean_name.split()[0].lower()
            if first_w in INVALID_NAMES or first_w in {"profil", "dewan", "susunan", "struktur", "tentang", "sejarah"}:
                continue

            # Ensure heading is not itself a recognized role or department name
            cls_name = role_classifier.classify_role(clean_name)
            if cls_name["is_match"] and cls_name["relevance_score"] >= 0.70:
                continue

            sib = heading.find_next_sibling(["h3", "h4", "h5", "p", "div"])
            if sib:
                title = sib.get_text().strip().split('\n')[0].strip()
                if 3 <= len(title) <= 60:
                    cls = role_classifier.classify_role(title)
                    if cls["is_match"] and clean_name.lower() not in seen_names:
                        seen_names.add(clean_name.lower())
                        people.append(self._make_candidate(
                            clean_name, title, cls, source_url,
                            "official_website", "VERIFIED", 0.95,
                            f"{clean_name} - {title} pada halaman {page_title}",
                            page_title=page_title, method="website_heading_extractor"
                        ))

        return people

    def _public_web_search_discovery(self, company_name: str, clean_name: str, website: Optional[str]) -> Tuple[List[Dict], List[Dict]]:
        """Search public web for HR & leadership using DuckDuckGo in parallel."""
        candidates, audit = [], []
        
        queries = [
            f'"{clean_name}" dewan direksi direktur utama',
            f'"{clean_name}" direktur human capital OR "human resources" OR "talent acquisition"',
            f'"{clean_name}" susunan dewan komisaris direksi terbaru',
            f'site:linkedin.com/in/ "{clean_name}" "Human Resources" OR "Human Capital"',
        ]

        fetched_articles: Set[str] = set()

        def _run_query(q: str):
            items = self._search_ddgs(q, max_results=5)
            return q, items

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_to_q = {executor.submit(_run_query, q): q for q in queries}
            for future in concurrent.futures.as_completed(future_to_q):
                q, search_items = future.result()
            
            audit.append({
                "query": q,
                "results_count": len(search_items),
                "source": "public_web_search",
                "items": search_items[:5]
            })

            for r in search_items:
                r_title, r_snippet, r_url = r["title"], r["snippet"], r["url"]
                if not r_title and not r_snippet:
                    continue

                # Fetch authoritative articles (max 2)
                if len(fetched_articles) < settings.MAX_ARTICLE_FETCHES and r_url not in fetched_articles:
                    if any(k in r_url.lower() for k in ["cnbcindonesia", "infobei", "bisnis.com", "kontan.co.id", "detik.com", "idx.co.id"]) or \
                       any(kw in r_snippet.lower() for kw in ["susunan dewan", "dewan direksi", "jajaran direksi", "direktur human capital"]):
                        fetched_articles.add(r_url)
                        try:
                            art_resp = self.session.get(r_url, timeout=3, verify=False)
                            if art_resp.status_code == 200:
                                art_soup = BeautifulSoup(art_resp.text, "html.parser")
                                art_text = art_soup.get_text()
                                m = re.search(r'(Dewan Direksi.*?(?:Dewan Komisaris|#|\Z))', art_text, re.DOTALL | re.IGNORECASE)
                                if not m:
                                    m = re.search(r'(Dewan Komisaris.*?(?:#|\Z))', art_text, re.DOTALL | re.IGNORECASE)
                                if m:
                                    excerpt = m.group(1)[:2000].replace('\n', ' ')
                                    excerpt = re.sub(r'\s+', ' ', excerpt).strip()
                                    audit.append({"url": r_url, "title": r_title, "snippet": excerpt, "source": "media_article"})
                        except Exception:
                            pass

                # Rule-based pattern matching
                exec_pattern = re.compile(
                    r'(Direktur Utama|Wakil Direktur Utama|Direktur Human Capital[^\:\,\.]*|Direktur Keuangan|Direktur Operasi[^\:\,\.]*|Direktur Manajemen Risiko|Direktur SDM|Komisaris Utama|Komisaris Independen|Komisaris)\s*:\s*([A-Z][a-zA-Z\.\s,]+?)(?:\s+(?:Wakil|Direktur|Komisaris|Dewan|\d|\(|\-|\.|$))',
                    re.IGNORECASE
                )
                combined_text = f"{r_title}. {r_snippet}"
                for m in exec_pattern.finditer(combined_text):
                    p_title = m.group(1).strip()
                    p_name = m.group(2).strip().rstrip('.,;')
                    if 3 <= len(p_name) <= 40 and len(p_name.split()) >= 2:
                        cls = role_classifier.classify_role(p_title)
                        if cls["is_match"]:
                            candidates.append(self._make_candidate(
                                p_name, p_title, cls, r_url,
                                "public_web_search", "PARTIALLY_VERIFIED", 0.88,
                                f"Public record: {p_title}: {p_name}",
                                page_title=r_title, method="public_search_parser"
                            ))

                # LinkedIn profile title pattern
                if "linkedin.com/in/" in r_url.lower():
                    title_match = re.search(r'^([A-Z][a-zA-Z\.\s]{2,30}?)\s*[-–|:]\s*([A-Za-z\s&]{3,40}?)(?:\s*[-–|]|\s*at|\s*di|\s*–|\s*\||$)', r_title)
                    if title_match:
                        p_name = title_match.group(1).strip()
                        p_title = title_match.group(2).strip()
                        if 2 <= len(p_name.split()) <= 5:
                            cls = role_classifier.classify_role(p_title)
                            if cls["is_match"] and cls["relevance_score"] >= 0.60:
                                candidates.append(self._make_candidate(
                                    p_name, p_title, cls, r_url,
                                    "linkedin_public", "PARTIALLY_VERIFIED", 0.85,
                                    r_snippet or f"LinkedIn profile for {clean_name}",
                                    page_title=r_title, method="linkedin_search_parser"
                                ))

        return candidates, audit

    def _grounded_ai_extraction(self, company_name: str, audit_log: List[Dict]) -> List[Dict]:
        """Use Gemini to parse evidence texts for personnel. Zero hallucination."""
        snippets = []
        for item in audit_log:
            if item.get("snippet"):
                snippets.append(f"Source [{item.get('title', '')}]: {item['snippet']}")
            elif item.get("items"):
                for it in item["items"][:4]:
                    if it.get("snippet"):
                        snippets.append(f"Result [{it.get('title', '')}]: {it.get('snippet', '')}")
        
        if not snippets:
            return []

        items = self.ai.extract_professionals_from_evidence(company_name, snippets)
        
        parsed = []
        for it in items:
            cls = role_classifier.classify_role(it["job_title"])
            if cls["is_match"]:
                parsed.append(self._make_candidate(
                    it["person_name"].strip(), it["job_title"].strip(),
                    cls, it.get("source_url"),
                    "ai_grounded_parser", "PARTIALLY_VERIFIED", 0.88,
                    it.get("evidence_text") or f"AI-extracted from public records of {company_name}",
                    method="ai_grounded_parser"
                ))
        return parsed

    def _make_candidate(
        self, name: str, title: str, cls: Dict, source_url: Optional[str],
        source_type: str, verification: str, confidence: float,
        evidence: str, page_title: str = "", method: str = "website_scraper"
    ) -> Dict[str, Any]:
        """Create a standardized candidate dict."""
        return {
            "person_name": name,
            "job_title": title,
            "normalized_title": cls.get("matched_title"),
            "department": cls.get("department", "Other"),
            "seniority_level": cls.get("seniority_level", "Staff"),
            "profile_url": source_url,
            "contact_email": None,
            "contact_phone": None,
            "source_url": source_url,
            "source_type": source_type,
            "source_page_title": page_title or "Public Source",
            "evidence_text": evidence,
            "extraction_method": method,
            "verification_status": verification,
            "confidence_score": confidence,
            "relevance_score": cls.get("relevance_score", 0.5),
            "relevance_reason": cls.get("relevance_reason", ""),
            "outreach_status": "NEW_LEAD"
        }

    @staticmethod
    def _clean_and_validate_name(raw_name: str) -> Optional[str]:
        if not raw_name or len(raw_name.strip()) < 3 or len(raw_name.strip()) > 45:
            return None
        if '\n' in raw_name or '\r' in raw_name:
            return None
        
        # Remove common honorifics & prefixes
        clean = re.sub(r'^(?:Beliau|Ia|Dia|Warga\s+negara|Bapak|Ibu|Ir\.?|Drs\.?|Dr\.?|Prof\.?)\s+', '', raw_name.strip(), flags=re.IGNORECASE).strip()
        # Remove leading dot prefixes (e.g. "Pengendali. Andik Wahyudi" -> "Andik Wahyudi")
        m_dot = re.match(r'^[A-Za-z\s]+\.\s+([A-Z][a-zA-Z\s\.]+)$', clean)
        if m_dot:
            clean = m_dot.group(1).strip()

        words = clean.split()
        if not (1 <= len(words) <= 5):
            return None

        STOP_WORDS = {
            'dan', 'atau', 'juga', 'saat', 'ini', 'mulai', 'bekerja', 'di', 'perseroan', 'pada',
            'setelah', 'sebelum', 'beliau', 'dia', 'ia', 'warga', 'negara', 'indonesia',
            'pengendali', 'kemudian', 'lalu', 'sebagai', 'menjadi', 'sejak', 'tahun', 'tersebut',
            'jakarta', 'surabaya', 'kediri', 'adapun', 'sementara', 'oleh', 'dengan', 'serta',
            'profil', 'dewan', 'susunan', 'struktur', 'tentang', 'sejarah', 'kebijakan', 'tata', 'kelola'
        }
        for w in words:
            w_clean = re.sub(r'[^a-zA-Z]', '', w.lower())
            if w_clean in STOP_WORDS:
                return None

        # Check if name is itself a recognized role
        cls = role_classifier.classify_role(clean)
        if cls.get("is_match") and cls.get("relevance_score", 0) >= 0.70:
            return None

        return clean

    def _merge_and_deduplicate(self, candidates: List[Dict], company_name: str) -> List[Dict]:
        """Deduplicate by normalized person name, merge evidence."""
        deduped: Dict[str, Dict] = {}

        for c in candidates:
            raw_name = c.get("person_name", "")
            validated_name = self._clean_and_validate_name(raw_name)
            if not validated_name:
                continue

            c["person_name"] = validated_name
            clean_key = validated_name.lower()

            if clean_key in deduped:
                existing = deduped[clean_key]
                # Elevate if from better source
                if c.get("source_type") in ["official_website", "wikipedia_infobox"]:
                    existing["verification_status"] = "VERIFIED"
                    existing["source_url"] = c.get("source_url") or existing["source_url"]
                    existing["source_type"] = c.get("source_type")
                    existing["confidence_score"] = max(existing.get("confidence_score", 0.5), 0.95)
                    if c.get("evidence_text"):
                        existing["evidence_text"] = c["evidence_text"]
                elif existing.get("verification_status") == "PARTIALLY_VERIFIED":
                    existing["confidence_score"] = min(0.92, existing.get("confidence_score", 0.8) + 0.05)
            else:
                deduped[clean_key] = c

        # Add LinkedIn search shortcut URL
        for c in deduped.values():
            p_name = c.get("person_name", "")
            linkedin_search = f"https://www.linkedin.com/search/results/all/?keywords={urllib.parse.quote(p_name)}+{urllib.parse.quote(company_name)}"
            c["linkedin_search_url"] = linkedin_search
            if not c.get("profile_url") or "linkedin.com/in/" not in str(c.get("profile_url", "")):
                c["profile_url"] = linkedin_search

        return sorted(
            deduped.values(),
            key=lambda x: (x.get("relevance_score", 0), x.get("confidence_score", 0)),
            reverse=True
        )

    def _persist_professionals_to_db(self, db: Session, company_id: int, professionals: List[Dict]) -> List[CompanyProfessional]:
        """Save professionals to DB, preserving existing outreach data."""
        persisted = []

        for p in professionals:
            raw_name = p.get("person_name", "").strip()
            clean_key = re.sub(r'^(Bapak|Ibu|Ir\.?|Drs\.?|Dr\.?|Prof\.?)\s+', '', raw_name, flags=re.IGNORECASE).strip()

            existing = db.query(CompanyProfessional).filter(
                CompanyProfessional.company_id == company_id,
                CompanyProfessional.person_name.ilike(f"%{clean_key}%")
            ).first()

            if existing:
                if p.get("confidence_score", 0) > (existing.confidence_score or 0):
                    existing.confidence_score = p["confidence_score"]
                if p.get("verification_status") == "VERIFIED":
                    existing.verification_status = "VERIFIED"
                if p.get("source_url") and not existing.source_url:
                    existing.source_url = p["source_url"]
                if p.get("profile_url") and not existing.profile_url:
                    existing.profile_url = p["profile_url"]
                if p.get("evidence_text") and not existing.evidence_text:
                    existing.evidence_text = p["evidence_text"]
                if p.get("relevance_score", 0) > (existing.relevance_score or 0):
                    existing.relevance_score = p["relevance_score"]
                    existing.relevance_reason = p.get("relevance_reason")
                existing.last_verified_at = datetime.utcnow()
                existing.updated_at = datetime.utcnow()
                persisted.append(existing)
            else:
                new_prof = CompanyProfessional(
                    company_id=company_id,
                    person_name=p["person_name"],
                    job_title=p["job_title"],
                    normalized_title=p.get("normalized_title"),
                    department=p.get("department", "Human Resources"),
                    seniority_level=p.get("seniority_level", "Staff"),
                    profile_url=p.get("profile_url"),
                    contact_email=p.get("contact_email"),
                    contact_phone=p.get("contact_phone"),
                    source_url=p.get("source_url"),
                    source_type=p.get("source_type", "official_website"),
                    source_page_title=p.get("source_page_title"),
                    evidence_text=p.get("evidence_text"),
                    extraction_method=p.get("extraction_method", "website_scraper"),
                    verification_status=p.get("verification_status", "UNVERIFIED"),
                    confidence_score=p.get("confidence_score", 0.5),
                    relevance_score=p.get("relevance_score", 0.5),
                    relevance_reason=p.get("relevance_reason"),
                    outreach_status="NEW_LEAD",
                    is_do_not_contact=False,
                    discovery_date=datetime.utcnow(),
                    last_verified_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_prof)
                persisted.append(new_prof)

        db.commit()
        for obj in persisted:
            db.refresh(obj)
        return persisted


professional_finder = ProfessionalDiscoveryService()
