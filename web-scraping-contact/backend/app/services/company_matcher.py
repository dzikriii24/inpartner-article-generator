import re
import urllib.parse
from typing import Dict, Any, List, Optional

BLACKLISTED_DOMAINS = {
    # News & Media
    "kompas.com", "detik.com", "tempo.co", "cnbcindonesia.com", "bisnis.com", 
    "kontan.co.id", "liputan6.com", "kumparan.com", "idntimes.com", "merdeka.com", 
    "tribunnews.com", "suara.com", "katadata.co.id", "antaranews.com", "sindonews.com",
    
    # Legal / Consulting / Virtual office blogs
    "siplawfirm.id", "voffice.co.id", "hukumonline.com", "izindotid.com", 
    "legalku.com", "mitrahukum.com", "smartlegal.id",
    
    # Job Portals
    "jobstreet.co.id", "jobstreet.com", "glints.com", "kalibrr.com", 
    "karir.com", "indeed.com", "loker.id", "kitalulus.com",
    
    # Directories & Regulatory
    "idx.co.id", "kemenkeu.go.id", "kemendag.go.id", "ahu.go.id", "bps.go.id", 
    "ojk.go.id", "yellowpages.co.id", "indonetwork.co.id",
    
    # Social & Encyclopedias
    "wikipedia.org", "wikimedia.org", "facebook.com", "instagram.com", 
    "twitter.com", "x.com", "youtube.com", "tiktok.com", "linkedin.com",
    "pinterest.com", "threads.net"
}

class CompanyMatcher:
    @staticmethod
    def clean_company_name(name: str) -> str:
        """Strip corporate legal tags to obtain clean brand name."""
        if not name:
            return ""
        cleaned = re.sub(r'(?i)(\(persero\)|\b(perseroan terbatas|perseroan|terbatas|pt\.?|cv\.?|tbk?\.?|corp\.?|corporation|ltd\.?|inc\.?)\b)', '', name)
        cleaned = re.sub(r'[\(\)\[\],.]', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned or name.strip()

    @staticmethod
    def get_keywords(name: str) -> List[str]:
        clean = CompanyMatcher.clean_company_name(name)
        return [w.lower() for w in clean.split() if len(w) > 2]

    @staticmethod
    def is_candidate_valid(domain: str) -> bool:
        """Check if domain is not on blacklist or generic host."""
        if not domain:
            return False
        d = domain.lower()
        if d.startswith("www."):
            d = d[4:]
        
        for bl in BLACKLISTED_DOMAINS:
            if d == bl or d.endswith("." + bl):
                return False
        
        # Check generic free hosts
        if any(h in d for h in ["wordpress.", "blogspot.", "wixsite.", "github.io", "google.com", "bing.com"]):
            return False
            
        return True

    @staticmethod
    def evaluate_website_match(
        company_name: str, 
        candidate_url: str, 
        page_title: str = "", 
        page_text: str = ""
    ) -> Dict[str, Any]:
        """
        Evaluate if candidate website genuinely belongs to target company.
        Returns match score (0.0 to 1.0), reasoning, and recommendation.
        """
        parsed = urllib.parse.urlparse(candidate_url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]

        if not CompanyMatcher.is_candidate_valid(domain):
            return {
                "is_match": False,
                "score": 0.0,
                "reason": f"Domain {domain} is blacklisted or an aggregator/news/directory.",
                "status": "REJECTED"
            }

        title_lower = page_title.lower() if page_title else ""
        text_lower = page_text[:2000].lower() if page_text else ""
        combined_text = f"{title_lower} {text_lower}"

        # Reject parked, expired, or for-sale domains
        PARKED_INDICATORS = [
            "situs web ini dijual", "domain ini dijual", "domain for sale", "buy this domain",
            "this domain may be for sale", "domain is for sale", "domain parking", "sedang dijual",
            "domain expired", "parked on", "hubungi kami untuk membeli domain", "baca manga"
        ]
        if any(p in combined_text for p in PARKED_INDICATORS):
            return {
                "is_match": False,
                "score": 0.0,
                "reason": f"Domain {domain} is parked, expired, or for sale.",
                "status": "REJECTED"
            }

        clean_name = CompanyMatcher.clean_company_name(company_name).lower()
        keywords = CompanyMatcher.get_keywords(company_name)
        domain_clean = re.sub(r'[^a-z0-9]', '', domain)

        score = 0.0
        reasons = []

        # 1. Domain match check
        # Check if full clean name is in domain (e.g. "telkom" in "telkom.co.id")
        keyword_domain_matches = sum(1 for kw in keywords if kw in domain_clean)
        if keywords and keyword_domain_matches == len(keywords):
            score += 0.50
            reasons.append("Domain contains all company keywords")
        elif keywords and keyword_domain_matches > 0:
            score += 0.35
            reasons.append(f"Domain contains {keyword_domain_matches}/{len(keywords)} keywords")

        # 2. Page Title check
        if clean_name and clean_name in title_lower:
            score += 0.30
            reasons.append("Page title matches company name")
        elif any(kw in title_lower for kw in keywords):
            score += 0.15
            reasons.append("Page title contains company keyword")

        # 3. Copyright / Legal notice check in page text
        # Look for copyright or PT statement
        copyright_pattern = re.compile(rf'(?:copyright|©|\(c\))\s*(?:[0-9]{{4}}\s*)?.*?(?:{re.escape(clean_name)}|{re.escape(company_name.lower())})')
        if copyright_pattern.search(text_lower):
            score += 0.25
            reasons.append("Copyright/legal notice in page mentions company")
        elif any(f"pt {kw}" in text_lower for kw in keywords):
            score += 0.15
            reasons.append("Page text mentions PT + company keyword")

        # Cap score
        final_score = min(1.0, round(score, 2))
        is_match = final_score >= 0.50

        return {
            "is_match": is_match,
            "score": final_score,
            "reason": "; ".join(reasons) if reasons else "Insufficient evidence to match entity",
            "status": "MATCHED" if final_score >= 0.70 else ("NEEDS_REVIEW" if is_match else "REJECTED")
        }

company_matcher = CompanyMatcher()
