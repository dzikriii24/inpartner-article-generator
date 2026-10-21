import re
import json
import urllib.parse
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.schema import Company, CompanyContact, SearchHistory
from app.services.providers.bing_provider import BingSearchProvider
from app.services.providers.wikipedia_provider import WikipediaProvider
from app.services.providers.web_scraper import WebScraperService
from app.services.providers.gemini_ai import GeminiAIService
from app.services.company_matcher import CompanyMatcher
from app.services.contact_extractor import GroundedContactExtractor

logger = logging.getLogger(__name__)

class CompanySearchEngine:
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
        all_tok = "".join(tokens)
        candidates.extend([
            f"https://www.{all_tok}.co.id",
            f"https://{all_tok}.co.id",
            f"https://www.{all_tok}.id",
            f"https://{all_tok}.id",
            f"https://www.{all_tok}.com",
            f"https://{all_tok}.com",
        ])
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
        else:
            candidates.extend([
                f"https://www.{tokens[0]}.co.id",
                f"https://{tokens[0]}.co.id",
                f"https://www.{tokens[0]}.com",
                f"https://{tokens[0]}.com",
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
        # STEP 2.5: Direct Official Domain Probing
        # -------------------------------------------------------------
        if not website:
            domain_candidates = self.generate_candidate_domains(company_name)
            probe_session = requests.Session()
            probe_session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
            })
            for probe_url in domain_candidates[:16]:
                parsed_p = urllib.parse.urlparse(probe_url)
                pd = parsed_p.netloc.lower()
                if pd.startswith("www."):
                    pd = pd[4:]
                if pd in seen_domains:
                    continue
                try:
                    p_resp = probe_session.get(probe_url, timeout=3.0, allow_redirects=True, verify=False)
                    if p_resp.status_code == 200 and len(p_resp.text) > 100:
                        seen_domains.add(pd)
                        p_soup = BeautifulSoup(p_resp.text[:40000], "html.parser")
                        p_title = p_soup.title.string.strip() if p_soup.title and p_soup.title.string else ""
                        p_text = p_soup.get_text()[:2000]

                        match_eval = CompanyMatcher.evaluate_website_match(
                            company_name=company_name,
                            candidate_url=p_resp.url,
                            page_title=p_title,
                            page_text=p_text
                        )
                        match_eval["domain"] = pd
                        match_eval["url"] = p_resp.url
                        match_eval["snippet"] = f"Direct Official Domain Probe ({p_title})"
                        candidate_domain_evals.append(match_eval)

                        if match_eval["is_match"] and match_eval["status"] != "REJECTED":
                            candidate_urls.append(p_resp.url)
                            evidence_snippets.append(f"Direct Domain [{p_title}]: {p_resp.url}")
                            if match_eval["score"] >= 0.75:
                                website = p_resp.url
                                website_selection_reason = f"Direct verified domain probe (Score: {match_eval['score']}): {match_eval['reason']}"
                                logger.info(f"Direct probe confirmed website for '{company_name}': {website}")
                                break
                except Exception:
                    continue

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
        if website:
            logger.info(f"Initiating crawling for target website: {website}")
            scraper_res = self.scraper.scrape_website_contacts(website)
            browser_used = scraper_res.get("browser_used", False)
            crawled_pages_audit = scraper_res.get("audit", [])

            # Check if any page was successfully reached
            success_pages = [p for p in crawled_pages_audit if p.get("status_code") == 200]
            if not success_pages and crawled_pages_audit:
                website_unreachable = True
                logger.warning(f"Official website {website} was unreachable (all pages failed).")

            raw_contacts.extend(scraper_res.get("contacts", []))
            evidence_snippets.extend(scraper_res.get("snippets", []))

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
        if website_unreachable:
            search_status = "WEBSITE_UNREACHABLE"
        elif len(unique_contacts) > 0 and website:
            # Check if domain was high confidence
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
        confidence = 0.40
        if wiki_data:
            confidence += 0.20
        if website and not website_unreachable:
            confidence += 0.20
        if len(unique_contacts) > 0:
            confidence += min(0.20, len(unique_contacts) * 0.05)
        if search_status == "NEEDS_REVIEW":
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
        if db:
            company_obj = self._persist_to_db(db, result_payload, search_type=search_type)
            result_payload["company_id"] = company_obj.id

        logger.info(f"=== [SearchEngine] Completed '{company_name}' -> Status: {search_status}, Contacts: {len(unique_contacts)}, Confidence: {confidence} ===")
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
