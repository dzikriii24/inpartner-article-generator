import json
import logging
import re
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiAIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self.is_available = False
        
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.is_available = True
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Client: {e}")
                self.is_available = False

    def enrich_from_evidence(
        self, 
        company_input: str, 
        evidence_snippets: List[str],
        candidate_urls: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Use Gemini AI strictly for entity reconciliation, official name normalization,
        industry classification, and structured address parsing based on real gathered evidence.
        AI is PROHIBITED from inventing or hallucinating contacts.
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
        models_to_try = [
            settings.DEFAULT_GEMINI_MODEL,
            "gemini-3.1-flash-lite",
            settings.FALLBACK_GEMINI_MODEL,
            "gemini-3.7-flash",
            "gemini-flash-latest"
        ]

        for model_name in models_to_try:
            try:
                resp = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                if resp and resp.text:
                    clean_text = resp.text.strip()
                    if clean_text.startswith("```"):
                        clean_text = re.sub(r"^```(?:json)?\n?", "", clean_text)
                        clean_text = re.sub(r"\n?```$", "", clean_text)
                    
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Gemini generation with {model_name} failed: {err_str}")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota exceeded" in err_str:
                    logger.warning("Gemini daily quota exhausted. Disabling AI synthesis for remaining searches to prevent latency.")
                    self.is_available = False
                    return None
                continue

        return None

gemini_ai = GeminiAIService()
