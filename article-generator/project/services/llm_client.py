import os
import time
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

# Candidate fallback models in priority order per role (using active Gemini models)
MODEL_ROLE_CONFIG = {
    "RESEARCH": os.getenv("RESEARCH_MODEL", "gemini-3.5-flash-lite"),
    "REASONING": os.getenv("REASONING_MODEL", "gemini-3.5-flash-lite"),
    "COMPOSITION": os.getenv("COMPOSITION_MODEL", "gemini-3.5-flash"),
    "LIGHTWEIGHT": os.getenv("LIGHTWEIGHT_MODEL", "gemini-3.5-flash-lite"),
}

FALLBACK_CHAINS = {
    "RESEARCH": ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"],
    "REASONING": ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"],
    "COMPOSITION": ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
    "LIGHTWEIGHT": ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"]
}

_client_instance = None

def get_genai_client():
    global _client_instance
    if _client_instance is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing")
        _client_instance = genai.Client(api_key=api_key)
    return _client_instance

def call_llm(prompt: str, role: str = "REASONING", max_retries_per_model: int = 2) -> tuple[str | None, str | None]:
    """
    Call LLM with role-based primary model selection, rate-limit retry with exponential backoff,
    and automatic fallback across candidate models.
    
    Returns:
        (response_text, model_used_name)
    """
    client = get_genai_client()
    
    primary_model = MODEL_ROLE_CONFIG.get(role, "gemini-3.6-flash")
    chain = FALLBACK_CHAINS.get(role, ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"])
    
    # Ensure primary_model is first in the list
    if primary_model in chain:
        candidate_models = [primary_model] + [m for m in chain if m != primary_model]
    else:
        candidate_models = [primary_model] + chain

    for model_name in candidate_models:
        for attempt in range(max_retries_per_model):
            try:
                print(f"[LLM Router] Calling role={role} with model={model_name} (attempt {attempt+1}/{max_retries_per_model})...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip(), model_name
            except Exception as e:
                err_msg = str(e)
                print(f"[LLM Router Warning] Model {model_name} failed on attempt {attempt+1}: {err_msg}")
                
                # Check for rate limit / 429 / 503 / Resource Exhausted
                is_transient = any(code in err_msg for code in ["429", "503", "Quota", "EXHAUSTED", "UNAVAILABLE", "high demand"])
                if is_transient and attempt < max_retries_per_model - 1:
                    wait_sec = (attempt + 1) * 3
                    print(f"[LLM Router] Transient error on {model_name}. Retrying in {wait_sec}s...")
                    time.sleep(wait_sec)
                    continue
                
                # If non-transient or last attempt on this model, break loop to try next candidate model
                print(f"[LLM Router] Falling back from model {model_name} to next candidate...")
                break

    print(f"[LLM Router Error] All candidate models in fallback chain failed for role={role}.")
    return None, None

def call_llm_json(prompt: str, role: str = "REASONING") -> tuple[dict | list | None, str | None]:
    """
    Call LLM expecting JSON output. Automatically strips markdown backticks, cleans up common JSON syntax issues (trailing commas), and parses JSON.
    """
    import re
    raw_text, model_used = call_llm(prompt, role=role)
    if not raw_text:
        return None, None
        
    clean_text = raw_text.strip()
    clean_text = re.sub(r'^```(?:json|markdown)?\s*', '', clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r'\s*```$', '', clean_text, flags=re.MULTILINE).strip()
    
    def try_parse(s: str):
        try:
            return json.loads(s)
        except Exception:
            # Fix trailing commas before } or ]
            s_fixed = re.sub(r',(\s*[}\]])', r'\1', s)
            try:
                return json.loads(s_fixed)
            except Exception:
                return None

    res = try_parse(clean_text)
    if res is not None:
        return res, model_used

    start_obj = clean_text.find("{")
    end_obj = clean_text.rfind("}")
    if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
        res = try_parse(clean_text[start_obj:end_obj+1])
        if res is not None:
            return res, model_used

    start_arr = clean_text.find("[")
    end_arr = clean_text.rfind("]")
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        res = try_parse(clean_text[start_arr:end_arr+1])
        if res is not None:
            return res, model_used

    print(f"[LLM Router Error] Failed to parse JSON response from {model_used}. Raw text sample: {raw_text[:200]}")
    return None, model_used

