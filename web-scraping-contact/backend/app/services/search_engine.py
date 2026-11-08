import re
import json
import urllib.parse
import logging
import concurrent.futures
from datetime import datetime
from typing import Dict, Any, List, Optional
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

from app.core.dns_fallback import install_dns_fallback
install_dns_fallback()

from app.models.schema import Company, CompanyContact, SearchHistory
from app.services.providers.bing_provider import BingSearchProvider
from app.services.providers.wikipedia_provider import WikipediaProvider
from app.services.providers.web_scraper import WebScraperService
from app.services.providers.gemini_ai import GeminiAIService
from app.services.company_matcher import CompanyMatcher
from app.services.contact_extractor import GroundedContactExtractor

logger = logging.getLogger(__name__)

class CompanySearchEngine:
    _domain_cache: Dict[str, Dict[str, Any]] = {}
    _cache_time: Dict[str, float] = {}

    def __init__(self):
        self.bing = BingSearchProvider()
        self.wiki = WikipediaProvider()
        self.scraper = WebScraperService()
        self.ai = GeminiAIService()

    @staticmethod
    def normalize_company_name(name: str) -> str:
        """Clean company name for search queries while retaining core identity."""
        if not name:
            return ""
        cleaned = re.sub(r'(?i)(\(persero\)|\b(perseroan terbatas|perseroan|terbatas|pt\.?|cv\.?|tbk?\.?|corp\.?|corporation|ltd\.?|inc\.?)\b)', '', name)
        cleaned = re.sub(r'[\(\)\[\],.]', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned or name.strip()

    @staticmethod
    def generate_candidate_domains(company_name: str) -> List[str]:
        clean = CompanySearchEngine.normalize_company_name(company_name)
        tokens = [w.lower() for w in clean.split() if len(w) > 1]
        if not tokens:
            return []

        candidates = []
        
        # 1. Primary brand token (e.g. "inpartner", "telkom", "astra", "gudanggaram")
        primary = tokens[0]
        candidates.extend([
            f"https://{primary}.id",
            f"https://www.{primary}.id",
            f"https://{primary}.co.id",
            f"https://www.{primary}.co.id",
            f"https://{primary}.com",
            f"https://www.{primary}.com",
        ])

        # 2. Combined all tokens (e.g. "inpartneroptimaintegra")
        all_tok = "".join(tokens)
        candidates.extend([
            f"https://www.{all_tok}.co.id",
            f"https://{all_tok}.co.id",
            f"https://www.{all_tok}.id",
            f"https://{all_tok}.id",
            f"https://www.{all_tok}.com",
            f"https://{all_tok}.com",
        ])

        # 3. First two tokens if company has multiple words
        if len(tokens) >= 2:
            two_tok = "".join(tokens[:2])
            candidates.extend([
                f"https://www.{two_tok}.co.id",
                f"https://{two_tok}.co.id",
                f"https://www.{two_tok}.id",
                f"https://{two_tok}.id",
                f"https://www.{two_tok}.com",
                f"https://{two_tok}.com",
                f"https://www.{two_tok}indonesia.co.id",
                f"https://{two_tok}indonesia.co.id",
                f"https://www.{two_tok}indonesia.com",
                f"https://{two_tok}indonesia.com",
            ])

        uniq = []
        for u in candidates:
            if u not in uniq:
                uniq.append(u)
        return uniq

    @staticmethod
    def extract_domain(url: str) -> Optional[str]:
        if not url:
            return None
        try:
            parsed = urllib.parse.urlparse(url)
            netloc = parsed.netloc.lower()
            if netloc.startswith("www."):
                netloc = netloc[4:]
            return netloc or None
        except Exception:
            return None

    def search_and_enrich(
        self, 
        company_name: str, 
        db: Optional[Session] = None, 
        search_type: str = "manual"
    ) -> Dict[str, Any]:
        """
        End-to-End Grounded Contact Enrichment Pipeline:
        1. Query normalization & entity decomposition
        2. Wikipedia lookup (high-trust structured infobox)
        3. Web search (Bing) for domain candidate discovery
        4. Strict domain evaluation using CompanyMatcher (blocks blacklisted/news/legal blogs)
        5. Deep crawling of official website (Tier 1 HTTP + Tier 2 Headless Chrome fallback)
        6. JSON-LD and footer extraction
        7. Strict Data Quality Gate & ground-truth verification
        8. AI assisted entity reconciliation (zero contact hallucinations allowed)
        9. Database persistence with comprehensive audit metadata
        """
        started_at = datetime.utcnow()
        clean_name = self.normalize_company_name(company_name)
        logger.info(f"=== [SearchEngine] Starting grounded enrichment for: '{company_name}' (clean: '{clean_name}') ===")

        # Check in-memory cache
        cache_key = clean_name.lower().strip()
        import time
        now = time.time()
        if cache_key in self._domain_cache:
            cache_entry = self._domain_cache[cache_key]
            cached_at = self._cache_time.get(cache_key, 0)
            if (now - cached_at) < settings.CACHE_TTL_COMPANY:
                logger.info(f"[SearchEngine] Returning in-memory cached result for '{company_name}'")
                cached_res = dict(cache_entry)
                cached_res["started_at"] = started_at
                cached_res["completed_at"] = datetime.utcnow()
                if db:
                    company_obj = self._persist_to_db(db, cached_res, search_type=search_type)
                    cached_res["company_id"] = company_obj.id
                return cached_res

        evidence_snippets: List[str] = []
        candidate_urls: List[str] = []
        raw_contacts: List[Dict[str, Any]] = []
        crawled_pages_audit: List[Dict[str, Any]] = []
        candidate_domain_evals: List[Dict[str, Any]] = []
        rejection_logs: List[str] = []

        official_name = company_name
        website = None
        website_selection_reason = ""
        industry = None
        description = None
        location_address = None
        city = None
        province = None
        browser_used = False

        # -------------------------------------------------------------
        # STEP 1: Wikipedia Lookups (Structured Official Data)
        # -------------------------------------------------------------
        wiki_data = self.wiki.get_company_data(company_name)
        if not wiki_data and clean_name != company_name:
            wiki_data = self.wiki.get_company_data(clean_name)

        if wiki_data:
            if wiki_data.get("official_name"):
                official_name = wiki_data["official_name"]
            if wiki_data.get("website"):
                website = wiki_data["website"]
                website_selection_reason = "Official website verified from Wikipedia Infobox"
                candidate_urls.append(website)
            if wiki_data.get("industry"):
                industry = wiki_data["industry"]
            if wiki_data.get("description"):
                description = wiki_data["description"]
                evidence_snippets.append(f"Wikipedia Infobox: {description}")
            if wiki_data.get("location"):
                location_address = wiki_data["location"]
            if wiki_data.get("wikipedia_url"):
                raw_contacts.append({
                    "contact_type": "website",
                    "url": wiki_data["wikipedia_url"],
                    "email": None,
                    "phone": None,
                    "source_url": wiki_data["wikipedia_url"],
                    "source_domain": "wikipedia.org",
                    "source_page_title": f"{official_name} - Wikipedia",
                    "source_section": "wikipedia_infobox",
                    "evidence_text": f"Official Wikipedia article page for {official_name}",
                    "extraction_method": "wikipedia_infobox",
                    "verification_status": "found_on_public_source",
                    "confidence_score": 0.95,
                    "raw_value": wiki_data["wikipedia_url"],
                    "notes": "Wikipedia Article"
                })

        # -------------------------------------------------------------
        # STEP 2: Web Search Candidate Discovery (Bing Search)
        # -------------------------------------------------------------
        search_query_1 = f"{company_name} official website kontak"
        search_query_2 = f"{clean_name} website perusahaan indonesia"
        
        bing_results_1 = self.bing.search(search_query_1, max_results=5)
        bing_results_2 = self.bing.search(search_query_2, max_results=5) if not website else []
        combined_bing = bing_results_1 + bing_results_2

        seen_domains = set()
        for res in combined_bing:
            parsed = urllib.parse.urlparse(res.url)
            d = parsed.netloc.lower()
            if d.startswith("www."):
                d = d[4:]
            
            if d in seen_domains:
                continue
            seen_domains.add(d)

            # Evaluate with CompanyMatcher
            match_eval = CompanyMatcher.evaluate_website_match(
                company_name=company_name,
                candidate_url=res.url,
                page_title=res.title,
                page_text=res.snippet
            )
            match_eval["domain"] = d
            match_eval["url"] = f"{parsed.scheme}://{parsed.netloc}"
            match_eval["snippet"] = res.snippet
            candidate_domain_evals.append(match_eval)

            if match_eval["is_match"] and match_eval["status"] != "REJECTED":
                candidate_urls.append(res.url)
                evidence_snippets.append(f"Web Search [{res.title}]: {res.snippet} (URL: {res.url})")

        # -------------------------------------------------------------
        # STEP 2.5: Direct Official Domain Probing (Parallel Fast-Probe)
        # -------------------------------------------------------------
        if not website:
            domain_candidates = self.generate_candidate_domains(company_name)
            
            def _probe_single(probe_url: str) -> Optional[Dict[str, Any]]:
                try:
                    s = requests.Session()
                    s.headers.update({
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
                    })
                    p_resp = s.get(probe_url, timeout=(2.0, 4.0), allow_redirects=True, verify=False)
                    if p_resp.status_code == 200 and len(p_resp.text) > 100:
                        parsed_p = urllib.parse.urlparse(p_resp.url)
                        pd = parsed_p.netloc.lower()
                        if pd.startswith("www."):
                            pd = pd[4:]
                        p_soup = BeautifulSoup(p_resp.text[:40000], "html.parser")
                        p_title = p_soup.title.string.strip() if p_soup.title and p_soup.title.string else ""
                        p_text = p_soup.get_text()[:2000]
                        m_eval = CompanyMatcher.evaluate_website_match(
                            company_name=company_name,
                            candidate_url=p_resp.url,
                            page_title=p_title,
                            page_text=p_text
                        )
                        m_eval["domain"] = pd
                        m_eval["url"] = p_resp.url
                        m_eval["snippet"] = f"Direct Official Domain Probe ({p_title})"
                        return m_eval
                except Exception:
                    return None
                return None

            # Filter candidates not seen yet
            unseen_probes = []
            for p_url in domain_candidates[:8]:
                parsed_p = urllib.parse.urlparse(p_url)
                pd = parsed_p.netloc.lower()
                if pd.startswith("www."):
                    pd = pd[4:]
                if pd not in seen_domains:
                    unseen_probes.append(p_url)

            if unseen_probes:
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    future_to_url = {executor.submit(_probe_single, u): u for u in unseen_probes}
                    for future in concurrent.futures.as_completed(future_to_url):
                        m_eval = future.result()
                        if m_eval:
                            candidate_domain_evals.append(m_eval)
                            seen_domains.add(m_eval.get("domain", ""))
                            if m_eval.get("is_match") and m_eval.get("status") != "REJECTED":
                                candidate_urls.append(m_eval["url"])
                                evidence_snippets.append(f"Direct Domain [{m_eval.get('domain')}]: {m_eval['url']}")
                                if m_eval.get("score", 0) >= 0.60 and not website:
                                    website = m_eval["url"]
                                    website_selection_reason = f"Direct verified domain probe (Score: {m_eval['score']}): {m_eval['reason']}"
                                    logger.info(f"Direct probe confirmed website for '{company_name}': {website}")

        # -------------------------------------------------------------
        # STEP 3: Select Official Website
        # -------------------------------------------------------------
        if not website:
            # Sort candidate domain evaluations by score descending
            valid_candidates = [c for c in candidate_domain_evals if c.get("is_match") and c.get("status") in ["MATCHED", "NEEDS_REVIEW"]]
            if valid_candidates:
                best_candidate = max(valid_candidates, key=lambda x: x["score"])
                website = best_candidate["url"]
                website_selection_reason = f"Selected from search results (Score: {best_candidate['score']}): {best_candidate['reason']}"
                logger.info(f"Selected official website candidate: {website} ({website_selection_reason})")
            else:
                logger.warning(f"No qualifying official website candidate found for '{company_name}'")

        # -------------------------------------------------------------
        # STEP 4: Deep Website Crawling (Tier 1 HTTP + Tier 2 Browser)
        # -------------------------------------------------------------
        website_unreachable = False
        is_waf_blocked = False
        if website:
            logger.info(f"Initiating crawling for target website: {website}")
            scraper_res = self.scraper.scrape_website_contacts(website)
            browser_used = scraper_res.get("browser_used", False)
            crawled_pages_audit = scraper_res.get("audit", [])
            is_waf_blocked = scraper_res.get("is_waf_blocked", False)

            # Check if any page was successfully reached
            success_pages = [p for p in crawled_pages_audit if p.get("status_code") == 200]
            if not success_pages and crawled_pages_audit:
                website_unreachable = True
                if is_waf_blocked:
                    logger.warning(f"Official website {website} is protected by CDN WAF (Access Denied / 403). Contacts will be reconciled from public records.")
                else:
                    logger.warning(f"Official website {website} was unreachable (all pages failed).")

            raw_contacts.extend(scraper_res.get("contacts", []))
            evidence_snippets.extend(scraper_res.get("snippets", []))

        # Fallback: If contacts are empty or website is WAF-protected, enrich from public business records
        if len(raw_contacts) == 0:
            contact_queries = [
                f'"{clean_name}" alamat kantor pusat telepon kontak',
                f'"{clean_name}" email sekretariat corcomm kontak'
            ]
            ddgs_client = None
            if DDGS is not None:
                try:
                    ddgs_client = DDGS()
                except Exception:
                    ddgs_client = None

            for cq in contact_queries:
                c_items = []
                if ddgs_client:
                    try:
                        c_items = list(ddgs_client.text(cq, max_results=3))
                    except Exception:
                        pass
                if not c_items:
                    try:
                        b_items = self.bing.search(cq, max_results=3)
                        c_items = [{"title": b.title, "href": b.url, "body": b.snippet} for b in b_items]
                    except Exception:
                        pass
                for ci in c_items:
                    c_body = ci.get("body", "")
                    c_url = ci.get("href", "")
                    c_title = ci.get("title", "")
                    if c_body:
                        evidence_snippets.append(f"Public Contact Record [{c_title}]: {c_body}")
                        c_soup = BeautifulSoup(f"<div>{c_body}</div>", "html.parser")
                        pub_contacts = GroundedContactExtractor.extract_footer_and_page_contacts(
                            c_soup, source_url=c_url, page_title=c_title, is_contact_page=True
                        )
                        raw_contacts.extend(pub_contacts)

        # -------------------------------------------------------------
        # STEP 5: AI Entity Reconciliation (Zero Hallucination Gate)
        # -------------------------------------------------------------
        if self.ai.is_available and (evidence_snippets or candidate_urls):
            ai_res = self.ai.enrich_from_evidence(company_name, evidence_snippets, candidate_urls)
            if ai_res:
                if ai_res.get("official_name") and (official_name == company_name or not official_name):
                    official_name = ai_res["official_name"]
                if ai_res.get("industry") and not industry:
                    industry = ai_res["industry"]
                if ai_res.get("description") and not description:
                    description = ai_res["description"]
                if ai_res.get("address") and not location_address:
                    location_address = ai_res["address"]
                if ai_res.get("city") and not city:
                    city = ai_res["city"]
                if ai_res.get("province") and not province:
                    province = ai_res["province"]

        # -------------------------------------------------------------
        # STEP 6: STRICT DATA QUALITY GATE & GROUND-TRUTH VERIFICATION
        # -------------------------------------------------------------
        verified_contacts: List[Dict[str, Any]] = []
        for c in raw_contacts:
            val = c.get("email") or c.get("phone") or c.get("address") or c.get("url") or ""
            if not val or len(str(val).strip()) < 3:
                rejection_logs.append(f"Rejected empty/short contact value: {val}")
                continue

            # Check evidence grounding: Every contact must have verifiable evidence
            evidence = c.get("evidence_text") or ""
            if not evidence.strip():
                rejection_logs.append(f"Rejected contact {val}: Missing source evidence text")
                continue

            # Validate emails
            if c.get("email"):
                if not GroundedContactExtractor.is_email_valid(c["email"]):
                    rejection_logs.append(f"Rejected invalid email: {c['email']}")
                    continue

            # Validate phones
            if c.get("phone"):
                clean_p = re.sub(r'[^0-9+]', '', str(c["phone"]))
                if len(clean_p) < 7:
                    rejection_logs.append(f"Rejected invalid phone format: {c['phone']}")
                    continue

            # Quality gate passed
            verified_contacts.append(c)

        # Deduplicate verified contacts
        unique_contacts = self._deduplicate_all_contacts(verified_contacts)

        # -------------------------------------------------------------
        # STEP 7: Status Classification & Confidence Scoring
        # -------------------------------------------------------------
        # Determine overall search status
        if website_unreachable and not is_waf_blocked and not wiki_data and len(unique_contacts) == 0:
            search_status = "WEBSITE_UNREACHABLE"
        elif is_waf_blocked or (website_unreachable and (wiki_data or len(unique_contacts) > 0)):
            # The company and website are verified, but automated HTTP is protected by WAF
            search_status = "COMPLETED" if len(unique_contacts) > 0 else "PARTIAL"
        elif len(unique_contacts) > 0 and website:
            best_score = max([c.get("score", 0.0) for c in candidate_domain_evals], default=0.8)
            if best_score < 0.65 and not wiki_data:
                search_status = "NEEDS_REVIEW"
            else:
                search_status = "COMPLETED"
        elif website and len(unique_contacts) == 0:
            search_status = "PARTIAL"
        elif not website and wiki_data:
            search_status = "PARTIAL"
        else:
            search_status = "NOT_FOUND"

        # Calculate confidence
        confidence = 0.50
        if wiki_data:
            confidence += 0.20
        if website and (not website_unreachable or is_waf_blocked):
            confidence += 0.15
        if len(unique_contacts) > 0:
            confidence += min(0.15, len(unique_contacts) * 0.05)
        if search_status == "COMPLETED":
            confidence = max(confidence, 0.85)
        elif search_status == "PARTIAL":
            confidence = max(confidence, 0.70)
        elif search_status == "NEEDS_REVIEW":
            confidence = min(confidence, 0.65)
        elif search_status == "WEBSITE_UNREACHABLE":
            confidence = 0.35
        elif search_status == "NOT_FOUND":
            confidence = 0.15

        confidence = round(min(0.99, confidence), 2)
        completed_at = datetime.utcnow()
        duration_sec = round((completed_at - started_at).total_seconds(), 2)

        # Audit metadata payload
        audit_metadata = {
            "input_company": company_name,
            "normalized_query": clean_name,
            "selected_website": website,
            "website_selection_reason": website_selection_reason,
            "candidate_domains_checked": candidate_domain_evals[:8],
            "pages_crawled_count": len(crawled_pages_audit),
            "pages_crawled_detail": crawled_pages_audit,
            "browser_crawler_used": browser_used,
            "contacts_extracted_raw": len(raw_contacts),
            "contacts_passed_quality_gate": len(unique_contacts),
            "rejections": rejection_logs[:10],
            "duration_seconds": duration_sec,
            "timestamp": completed_at.isoformat()
        }

        result_payload = {
            "input_name": company_name,
            "official_name": official_name or company_name,
            "normalized_name": clean_name,
            "website": website,
            "domain": self.extract_domain(website) if website else None,
            "industry": industry,
            "description": description,
            "country": "Indonesia",
            "province": province,
            "city": city,
            "address": location_address,
            "matching_confidence": confidence,
            "contacts_found_count": len(unique_contacts),
            "contacts": unique_contacts,
            "status": search_status,
            "search_status": search_status,
            "audit_metadata": audit_metadata,
            "started_at": started_at,
            "completed_at": completed_at
        }

        # -------------------------------------------------------------
        # STEP 8: Database Persistence
        # -------------------------------------------------------------
        company_obj = None
        if db:
            company_obj = self._persist_to_db(db, result_payload, search_type=search_type)
            result_payload["company_id"] = company_obj.id

        # -------------------------------------------------------------
        # STEP 9: Grounded HR & Decision Maker Discovery
        # -------------------------------------------------------------
        professionals_res = []
        try:
            from app.services.professional_finder import professional_finder
            prof_data = professional_finder.discover_professionals(
                company_name=company_name,
                website=website,
                linkedin_url=None,
                db=db,
                company_id=company_obj.id if company_obj else None
            )
            professionals_res = prof_data.get("professionals", [])
            audit_metadata["professionals_discovery"] = {
                "total_found": prof_data.get("total_found", 0),
                "department_breakdown": prof_data.get("department_breakdown", {}),
                "seniority_breakdown": prof_data.get("seniority_breakdown", {}),
                "sources_status": prof_data.get("sources_status", {})
            }
            if company_obj and db:
                company_obj.audit_metadata = json.dumps(audit_metadata, default=str)
                db.commit()
        except Exception as e:
            logger.warning(f"Professional discovery failed during search_and_enrich: {e}")

        result_payload["professionals"] = professionals_res
        result_payload["professionals_count"] = len(professionals_res)

        # Store in class-level memory cache
        if clean_name:
            self._domain_cache[clean_name.lower().strip()] = result_payload
            self._cache_time[clean_name.lower().strip()] = time.time()
            if len(self._domain_cache) > 200:
                oldest_key = min(self._cache_time, key=self._cache_time.get)
                self._domain_cache.pop(oldest_key, None)
                self._cache_time.pop(oldest_key, None)

        logger.info(f"=== [SearchEngine] Completed '{company_name}' -> Status: {search_status}, Contacts: {len(unique_contacts)}, Professionals: {len(professionals_res)}, Confidence: {confidence} ===")
        return result_payload

    def _deduplicate_all_contacts(self, contacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen_keys = set()
        deduped = []
        # Sort descending by confidence score
        sorted_c = sorted(contacts, key=lambda x: x.get("confidence_score", 0.8), reverse=True)

        for c in sorted_c:
            key = None
            if c.get("email"):
                key = f"email:{c['email'].lower()}"
            elif c.get("phone"):
                clean_phone = re.sub(r'[^0-9+]', '', str(c['phone']))
                key = f"phone:{clean_phone}"
            elif c.get("url"):
                key = f"url:{c['url'].lower()}"
            elif c.get("address"):
                key = f"address:{c['address'].lower()[:40]}"

            if key and key not in seen_keys:
                seen_keys.add(key)
                deduped.append(c)
            elif not key:
                deduped.append(c)
        return deduped

    def _persist_to_db(self, db: Session, data: Dict[str, Any], search_type: str = "manual") -> Company:
        """Save or update company, contacts, and search history in DB with full audit grounding."""
        existing = None
        if data.get("domain"):
            existing = db.query(Company).filter(Company.domain == data["domain"]).first()
        if not existing and data.get("normalized_name"):
            existing = db.query(Company).filter(Company.normalized_name == data["normalized_name"]).first()

        audit_json = json.dumps(data.get("audit_metadata", {}), default=str)

        if existing:
            # Update fields
            if data.get("official_name"):
                existing.official_name = data["official_name"]
            if data.get("website"):
                existing.website = data["website"]
            if data.get("domain"):
                existing.domain = data["domain"]
            if data.get("industry") and not existing.industry:
                existing.industry = data["industry"]
            if data.get("description") and not existing.description:
                existing.description = data["description"]
            if data.get("address") and not existing.address:
                existing.address = data["address"]
            if data.get("city") and not existing.city:
                existing.city = data["city"]
            if data.get("province") and not existing.province:
                existing.province = data["province"]
            
            existing.search_status = data["search_status"]
            existing.audit_metadata = audit_json
            existing.matching_confidence = max(existing.matching_confidence or 0.0, data["matching_confidence"])
            existing.updated_at = datetime.utcnow()
            company_obj = existing
        else:
            company_obj = Company(
                input_name=data["input_name"],
                official_name=data["official_name"],
                normalized_name=data["normalized_name"],
                website=data["website"],
                domain=data["domain"],
                industry=data["industry"],
                description=data["description"],
                country=data["country"],
                province=data.get("province"),
                city=data.get("city"),
                address=data["address"],
                search_status=data["search_status"],
                audit_metadata=audit_json,
                matching_confidence=data["matching_confidence"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(company_obj)
            db.flush()

        # Add newly extracted grounded contacts
        for c in data.get("contacts", []):
            # Check if this contact value already exists on this company
            c_val = c.get("email") or c.get("phone") or c.get("url") or c.get("address")
            existing_c = None
            if c.get("email"):
                existing_c = db.query(CompanyContact).filter(
                    CompanyContact.company_id == company_obj.id,
                    CompanyContact.email == c["email"]
                ).first()
            elif c.get("phone"):
                existing_c = db.query(CompanyContact).filter(
                    CompanyContact.company_id == company_obj.id,
                    CompanyContact.phone == c["phone"]
                ).first()

            if existing_c:
                # Upgrade evidence and status if newly scraped contact has richer evidence
                existing_c.source_url = c.get("source_url") or existing_c.source_url
                existing_c.source_domain = c.get("source_domain") or existing_c.source_domain
                existing_c.source_section = c.get("source_section") or existing_c.source_section
                existing_c.source_page_title = c.get("source_page_title") or existing_c.source_page_title
                existing_c.evidence_text = c.get("evidence_text") or existing_c.evidence_text
                existing_c.extraction_method = c.get("extraction_method") or existing_c.extraction_method
                existing_c.verification_status = c.get("verification_status") or existing_c.verification_status
                existing_c.confidence_score = max(existing_c.confidence_score or 0.0, c.get("confidence_score", 0.9))
                existing_c.last_verified_at = datetime.utcnow()
                existing_c.updated_at = datetime.utcnow()
            else:
                contact_obj = CompanyContact(
                    company_id=company_obj.id,
                    contact_type=c.get("contact_type", "general_email"),
                    contact_person_name=c.get("contact_person_name"),
                    job_title=c.get("job_title"),
                    department=c.get("department"),
                    email=c.get("email"),
                    phone=c.get("phone"),
                    address=c.get("address"),
                    url=c.get("url"),
                    source_url=c.get("source_url"),
                    source_domain=c.get("source_domain"),
                    source_page_title=c.get("source_page_title"),
                    source_section=c.get("source_section"),
                    evidence_text=c.get("evidence_text"),
                    extraction_method=c.get("extraction_method", "http_html"),
                    source_type=c.get("source_type", "official_website"),
                    verification_status=c.get("verification_status", "verified_official_website"),
                    confidence_score=c.get("confidence_score", 0.90),
                    raw_value=c.get("raw_value"),
                    notes=c.get("notes"),
                    last_verified_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(contact_obj)

        # Record in SearchHistory
        history = SearchHistory(
            query=data["input_name"],
            search_type=search_type,
            company_id=company_obj.id,
            status=data["search_status"],
            contacts_found_count=len(data.get("contacts", [])),
            results_summary=json.dumps({
                "official_name": data["official_name"],
                "website": data["website"],
                "status": data["search_status"],
                "contacts_count": len(data.get("contacts", []))
            }),
            started_at=data["started_at"],
            completed_at=data["completed_at"],
            created_at=datetime.utcnow()
        )
        db.add(history)
        db.commit()
        db.refresh(company_obj)
        return company_obj

company_search_engine = CompanySearchEngine()
