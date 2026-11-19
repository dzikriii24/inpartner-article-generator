import os
import re
import time
import json
import random
import threading
from dotenv import load_dotenv
from google import genai
from google.genai import types

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(_PROJECT_ROOT, ".env"), override=True)

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

MAX_PROMPT_CHARS = int(os.getenv("MAX_PROMPT_CHARS", "36000"))
LLM_HTTP_TIMEOUT_MS = int(os.getenv("LLM_HTTP_TIMEOUT_MS", "55000"))
MAX_CONCURRENT_LLM_CALLS = int(os.getenv("MAX_CONCURRENT_LLM_CALLS", "3"))

_client_instance = None
_client_lock = threading.Lock()
_llm_semaphore = threading.BoundedSemaphore(MAX_CONCURRENT_LLM_CALLS)


def _sanitize_error(msg: str) -> str:
    """Scrub any API keys or tokens from error messages before logging."""
    if not msg:
        return ""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and len(api_key) > 6 and api_key in msg:
        msg = msg.replace(api_key, "***REDACTED***")
    msg = re.sub(r"AIza[0-9A-Za-z\-_]{20,}", "***REDACTED_KEY***", msg)
    return msg[:350]


def reset_genai_client():
    global _client_instance
    with _client_lock:
        _client_instance = None


def get_genai_client():
    global _client_instance
    if _client_instance is None:
        with _client_lock:
            if _client_instance is None:
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise ValueError("GEMINI_API_KEY environment variable is missing")
                _client_instance = genai.Client(
                    api_key=api_key,
                    http_options=types.HttpOptions(timeout=LLM_HTTP_TIMEOUT_MS)
                )
    return _client_instance


def call_llm(prompt: str, role: str = "REASONING", max_retries_per_model: int = 2) -> tuple[str | None, str | None]:
    """
    Call LLM with role-based primary model selection, bounded concurrency,
    controlled HTTP timeout, exponential backoff for 429/5xx/SSL EOF, and fallback across candidate models.

    Returns:
        (response_text, model_used_name)
    """
    if not prompt or not isinstance(prompt, str):
        return None, None

    if len(prompt) > MAX_PROMPT_CHARS:
        prompt = prompt[:MAX_PROMPT_CHARS] + "\n...[truncated for token optimization]"

    primary_model = MODEL_ROLE_CONFIG.get(role, "gemini-3.5-flash")
    chain = FALLBACK_CHAINS.get(role, ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"])

    if primary_model in chain:
        candidate_models = [primary_model] + [m for m in chain if m != primary_model]
    else:
        candidate_models = [primary_model] + chain

    total_attempts = 0
    max_total_attempts = 5

    for model_name in candidate_models:
        for attempt in range(max_retries_per_model):
            if total_attempts >= max_total_attempts:
                break
            total_attempts += 1
            try:
                client = get_genai_client()
                with _llm_semaphore:
                    print(f"[LLM Router] Calling role={role} with model={model_name} (attempt {attempt+1}/{max_retries_per_model})...")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                if response and getattr(response, "text", None):
                    text_out = response.text.strip()
                    if text_out:
                        return text_out, model_name
            except Exception as e:
                err_msg = _sanitize_error(str(e))
                print(f"[LLM Router Warning] Model {model_name} failed on attempt {attempt+1}: {err_msg}")

                is_ssl_or_conn = any(code in err_msg for code in ["SSLError", "EOF", "Connection", "Reset", "Max retries exceeded", "BrokenPipe"])
                if is_ssl_or_conn:
                    reset_genai_client()

                is_rate_limit = any(code in err_msg for code in ["429", "Quota", "EXHAUSTED", "RATE_LIMIT"])
                is_server_or_net = is_ssl_or_conn or any(code in err_msg for code in ["500", "502", "503", "504", "UNAVAILABLE", "high demand", "timed out", "Timeout"])

                if (is_rate_limit or is_server_or_net) and attempt < max_retries_per_model - 1 and total_attempts < max_total_attempts:
                    base_wait = 3.0 if is_rate_limit else 1.0
                    wait_sec = min(10.0, (base_wait * (2 ** attempt)) + random.uniform(0.2, 0.6))
                    print(f"[LLM Router] Transient error on {model_name}. Backing off {wait_sec:.1f}s...")
                    time.sleep(wait_sec)
                    continue

                print(f"[LLM Router] Falling back from model {model_name} to next candidate...")
                break

    print(f"[LLM Router Error] All candidate models in fallback chain failed for role={role}.")
    return None, None


def call_llm_json(prompt: str, role: str = "REASONING") -> tuple[dict | list | None, str | None]:
    """
    Call LLM expecting JSON output. Automatically strips markdown backticks,
    cleans up common JSON syntax issues (trailing commas), and validates parsed JSON.
    """
    raw_text, model_used = call_llm(prompt, role=role)
    if not raw_text:
        return None, None

    clean_text = raw_text.strip()
    clean_text = re.sub(r'^```(?:json|markdown)?\s*', '', clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r'\s*```$', '', clean_text, flags=re.MULTILINE).strip()

    def try_parse(s: str):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, (dict, list)):
                return parsed
            return None
        except Exception:
            s_fixed = re.sub(r',(\s*[}\]])', r'\1', s)
            try:
                parsed = json.loads(s_fixed)
                if isinstance(parsed, (dict, list)):
                    return parsed
                return None
            except Exception:
                return None

    res = try_parse(clean_text)
    if res is not None:
        return res, model_used

    start_obj = clean_text.find("{")
    end_obj = clean_text.rfind("}")
    if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
        res = try_parse(clean_text[start_obj:end_obj + 1])
        if res is not None:
            return res, model_used

    start_arr = clean_text.find("[")
    end_arr = clean_text.rfind("]")
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        res = try_parse(clean_text[start_arr:end_arr + 1])
        if res is not None:
            return res, model_used

    print(f"[LLM Router Error] Failed to parse JSON response from {model_used}. Sample: {raw_text[:160]}")
    return None, model_used


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of strings using Gemini API.
    Processes in chunks to avoid batch limits and ensures output length matches input.
    """
    if not texts:
        return []

    all_embeddings = []

    chunk_size = 40
    for i in range(0, len(texts), chunk_size):
        chunk = [(t[:1200] if isinstance(t, str) and t.strip() else "empty") for t in texts[i:i + chunk_size]]
        success = False
        for attempt in range(2):
            try:
                client = get_genai_client()
                with _llm_semaphore:
                    response = client.models.embed_content(
                        model="gemini-embedding-2",
                        contents=chunk
                    )
                if hasattr(response, 'embeddings') and response.embeddings:
                    chunk_embs = []
                    for emb in response.embeddings:
                        vals = list(emb.values) if emb and hasattr(emb, 'values') and emb.values else []
                        if len(vals) > 768:
                            vals = vals[:768]
                        elif len(vals) < 768:
                            vals = vals + [0.0] * (768 - len(vals))
                        chunk_embs.append(vals)

                    while len(chunk_embs) < len(chunk):
                        chunk_embs.append([0.0] * 768)
                    all_embeddings.extend(chunk_embs[:len(chunk)])
                    success = True
                    break
            except Exception as e:
                err_msg = _sanitize_error(str(e))
                print(f"[LLM Router Error] Embedding failed for chunk {i} (attempt {attempt+1}): {err_msg}")
                reset_genai_client()
                if attempt == 0:
                    time.sleep(1.0)
        if not success:
            all_embeddings.extend([[0.0] * 768 for _ in chunk])

    while len(all_embeddings) < len(texts):
        all_embeddings.append([0.0] * 768)

    return all_embeddings[:len(texts)]
