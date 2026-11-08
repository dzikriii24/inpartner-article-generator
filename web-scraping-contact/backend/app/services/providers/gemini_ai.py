import json
import logging
import re
import time
import warnings
from typing import Dict, Any, List, Optional

warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")
warnings.filterwarnings("ignore", category=UserWarning, module="google.genai")

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiAIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self._initialized = False
        self.is_available = False
        self._init_error: Optional[str] = None

    def _ensure_client(self):
        """Lazy-initialize Google GenAI client only when AI generation is actually requested."""
        if self._initialized:
            return
        self._initialized = True
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.is_available = True
                logger.info("Gemini AI client lazily initialized successfully")
            except Exception as e:
                self._init_error = str(e)
                logger.warning(f"Failed to initialize Gemini Client: {e}")
                self.is_available = False
        else:
            self._init_error = "No GEMINI_API_KEY configured"
            logger.warning("Gemini AI disabled: no API key")

    def _safe_generate(self, prompt: str, models: Optional[List[str]] = None) -> Optional[str]:
        """Attempt generation with model fallback. Returns raw text or None."""
        self._ensure_client()
        if not self.is_available or not self.client:
            return None
        
        if models is None:
            models = [
                settings.DEFAULT_GEMINI_MODEL,
                settings.FALLBACK_GEMINI_MODEL,
            ]
        
        for model_name in models:
            try:
                start = time.time()
                resp = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                elapsed = round(time.time() - start, 2)
                
                if resp and resp.text:
                    logger.info(f"Gemini [{model_name}] responded in {elapsed}s")
                    return resp.text.strip()
                else:
                    logger.warning(f"Gemini [{model_name}] returned empty response")
                    
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Gemini [{model_name}] error: {err_str}")
                
                # DNS / network failure — don't retry other models
                if "getaddrinfo failed" in err_str or "ConnectionError" in err_str:
                    logger.error("Gemini API network unreachable (DNS failure). Skipping remaining models.")
                    return None
                
                # Rate limit — disable further calls
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota exceeded" in err_str:
                    logger.warning("Gemini quota exhausted. Disabling AI for this session.")
                    self.is_available = False
                    return None
                
                continue
        
        return None

    @staticmethod
    def _clean_json_text(text: str) -> str:
        """Strip markdown code fences from LLM JSON output."""
        clean = text.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\n?", "", clean)
            clean = re.sub(r"\n?```$", "", clean)
        return clean.strip()

    def enrich_from_evidence(
        self, 
        company_input: str, 
        evidence_snippets: List[str],
        candidate_urls: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Use Gemini for entity reconciliation — official name, industry, address.
        AI is PROHIBITED from inventing contacts.
        """
        if not self.is_available or not self.client:
            return None

        combined_evidence = "\n---\n".join(evidence_snippets[:8])
        if not combined_evidence.strip():
            return None

        prompt = f"""You are a Senior Entity Reconciliation Specialist.
Analyze the following authentic evidence gathered from public records and websites for the company: "{company_input}".

STRICT CONSTRAINTS (ZERO-HALLUCINATION POLICY):
1. Extract facts ONLY if they are explicitly mentioned in the provided EVIDENCE below.
2. DO NOT guess, predict, or invent phone numbers, emails, addresses, or URLs.
3. Identify the true official legal entity name (e.g. PT ..., Tbk).
4. Parse the headquarters address into city, province, and full address only if stated in the evidence.
5. If any information is absent from the evidence, you MUST output null.

CANDIDATE URLS:
{json.dumps(candidate_urls[:6])}

AUTHENTIC EVIDENCE SNIPPETS:
{combined_evidence}

Respond ONLY with valid JSON with this exact structure:
{{
  "official_name": "Official Registered Company Name or null",
  "industry": "Specific Industry / Sector or null",
  "description": "Short 1-2 sentence professional overview in Indonesian or null",
  "country": "Indonesia",
  "province": "Province name or null",
  "city": "City name or null",
  "address": "Full headquarters address or null",
  "postal_code": "Postal code or null",
  "data_quality_notes": "Summary of evidence strength or null"
}}
"""
        raw = self._safe_generate(prompt)
        if not raw:
            return None
        
        try:
            parsed = json.loads(self._clean_json_text(raw))
            if isinstance(parsed, dict):
                return parsed
        except Exception as parse_err:
            logger.warning(f"Failed to parse Gemini enrichment JSON: {parse_err}")
        
        return None

    def extract_professionals_from_evidence(
        self,
        company_name: str,
        evidence_texts: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Parse evidence texts for real people with leadership/HR roles.
        ZERO-HALLUCINATION: only extract people explicitly named in evidence.
        """
        if not self.is_available or not self.client or not evidence_texts:
            return []
        
        combined = "\n".join(evidence_texts[:14])
        if not combined.strip():
            return []

        prompt = f"""You are an executive parser. Extract ONLY real people mentioned in the following gathered text who hold leadership, Board of Directors (Direksi), Board of Commissioners (Komisaris), or Human Resources / Human Capital / Talent Acquisition roles at the company: "{company_name}".

STRICT CONSTRAINTS:
1. Extract ONLY people who are EXPLICITLY named in the text below.
2. DO NOT invent, hallucinate, or predict any person names, job titles, or emails.
3. If no HR or leadership people are explicitly mentioned in the text, output an empty JSON list [].

TEXT EVIDENCE:
{combined}

Respond ONLY with valid JSON array:
[
  {{
    "person_name": "Full Person Name",
    "job_title": "Official Title as stated in text",
    "evidence_text": "Exact quote from text",
    "source_url": "Source URL if stated or null"
  }}
]
"""
        raw = self._safe_generate(prompt)
        if not raw:
            return []
        
        try:
            items = json.loads(self._clean_json_text(raw))
            if isinstance(items, list):
                return [
                    it for it in items 
                    if isinstance(it, dict) 
                    and it.get("person_name") 
                    and it.get("job_title")
                    and len(str(it["person_name"]).strip()) >= 3
                ]
        except Exception as parse_err:
            logger.warning(f"Failed to parse Gemini professionals JSON: {parse_err}")
        
        return []

    def generate_search_queries(
        self,
        company_name: str,
        target_roles: List[str]
    ) -> List[str]:
        """
        Ask Gemini to generate targeted search queries for finding HR/leadership.
        Returns list of search query strings.
        """
        if not self.is_available or not self.client:
            return []
        
        roles_str = ", ".join(target_roles[:5])
        prompt = f"""Generate 4 targeted web search queries to find professionals in these roles: {roles_str} at the company "{company_name}" in Indonesia.

Requirements:
- Use both Indonesian and English terms
- Include variations of the company name  
- Focus on public professional profiles and corporate announcements
- Each query should be distinct and target different sources

Respond ONLY with a JSON array of strings:
["query 1", "query 2", "query 3", "query 4"]
"""
        raw = self._safe_generate(prompt)
        if not raw:
            return []
        
        try:
            queries = json.loads(self._clean_json_text(raw))
            if isinstance(queries, list):
                return [q for q in queries if isinstance(q, str) and len(q) > 5]
        except Exception:
            pass
        
        return []

    def get_status(self) -> Dict[str, Any]:
        """Return service health status."""
        return {
            "available": self.is_available,
            "has_api_key": bool(self.api_key),
            "default_model": settings.DEFAULT_GEMINI_MODEL,
            "fallback_model": settings.FALLBACK_GEMINI_MODEL,
            "init_error": self._init_error
        }


gemini_ai = GeminiAIService()
