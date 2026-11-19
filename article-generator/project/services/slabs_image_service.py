"""
AI Image Discovery Intelligence, Candidate Ranking, Pillow Optimization, and
Optional Gemini Image Generation Fallback for 1sLabs Content Automation.
"""

from __future__ import annotations

import base64
import io
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from bs4 import BeautifulSoup
from google.genai import types
from PIL import Image, ImageOps

from services.llm_client import call_llm_json, get_genai_client, _sanitize_error


_EXCLUDED_HEADING_KEYWORDS = (
    "faq",
    "pertanyaan yang sering",
    "kesimpulan",
    "penutup",
    "konsultasi",
    "hubungi",
    "tentang 1slabs",
)

_WATERMARK_OR_BAD_PATTERNS = (
    "watermark",
    "shutterstock",
    "istockphoto",
    "istock",
    "gettyimages",
    "getty images",
    "dreamstime",
    "123rf",
    "alamy",
    "depositphotos",
    "vectorstock",
    "vecteezy",
    "stock preview",
    "sample image",
    "meme",
    "qr code",
    "barcode",
    "coat of arms",
    "flag of",
    "svg logo",
    "favicon",
)

# Balanced 2-3 keyword English stock query mapping for high Openverse/Wikimedia/Unsplash/Pexels recall
_FALLBACK_QUERY_MAP: Tuple[Tuple[Tuple[str, ...], str], ...] = (
    (("hosting", "server", "cloud", "vps", "cpanel", "deploy", "ssl", "dns"), "server rack datacenter"),
    (("subdomain", "domain", "gratis", "free", "portfolio", "mahasiswa"), "developer laptop desk"),
    (("umkm", "company profile", "toko online", "e-commerce", "bisnis"), "small business laptop"),
    (("website", "web", "frontend", "react", "responsive", "landing page", "ui", "ux"), "web design laptop"),
    (("software", "aplikasi", "erp", "pos", "kasir", "inventori", "gudang", "custom"), "business software laptop"),
    (("database", "mysql", "api", "backend", "node", "laravel", "integrasi"), "programmer code monitor"),
    (("seo", "geo", "google", "search", "traffic", "analitik", "audit"), "analytics dashboard laptop"),
    (("ai", "otomasi", "automation", "workflow", "chatbot"), "software team office"),
    (("keamanan", "security", "maintenance", "backup", "patching"), "server cybersecurity monitor"),
    (("konsultasi", "consulting", "vendor", "arsitektur", "audit"), "office team meeting"),
)

_STOCK_QUERY_STOPWORDS = frozenset({
    "a", "an", "and", "at", "analyzing", "building", "checking", "clean", "configuring",
    "creating", "depicting", "digital", "for", "illustrating", "in", "managing", "modern",
    "of", "on", "or", "people", "person", "professional", "professionals", "reviewing",
    "showing", "the", "to", "using", "with", "working",
})


def _compact_stock_query(raw_query: str, max_words: int = 3) -> str:
    clean = re.sub(r"[^A-Za-z0-9\s\-]", " ", str(raw_query or "")).strip()
    tokens = [w for w in clean.split() if len(w) >= 2]
    core = [w for w in tokens if w.lower() not in _STOCK_QUERY_STOPWORDS]
    picked = (core or tokens)[:max_words]
    return " ".join(picked).strip()


def extract_sections_from_html(html_content: str) -> List[Dict[str, Any]]:
    """Extracts ordered H2 sections and short plain-text excerpts from article HTML."""
    if not html_content or not isinstance(html_content, str):
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    sections: List[Dict[str, Any]] = []
    h2_tags = soup.find_all("h2")

    for idx, h2 in enumerate(h2_tags):
        heading_text = re.sub(r"\s+", " ", h2.get_text(" ", strip=True)).strip()
        if not heading_text:
            continue
        lower_h = heading_text.lower()
        if any(bad in lower_h for bad in _EXCLUDED_HEADING_KEYWORDS):
            continue

        excerpt_parts: List[str] = []
        for sib in h2.find_next_siblings():
            if getattr(sib, "name", None) in ("h2",):
                break
            if getattr(sib, "name", None) in ("p", "li", "h3"):
                txt = re.sub(r"\s+", " ", sib.get_text(" ", strip=True)).strip()
                if txt:
                    excerpt_parts.append(txt)
                if sum(len(x) for x in excerpt_parts) >= 260:
                    break

        sections.append({
            "section_index": idx,
            "heading": heading_text[:180],
            "summary": " ".join(excerpt_parts)[:280],
        })

    return sections


def _pick_balanced_sections(sections: List[Dict[str, Any]], max_inline: int) -> List[Dict[str, Any]]:
    """Selects well-spaced H2 sections proportional to article length."""
    if not sections or max_inline <= 0:
        return []
    count = min(max_inline, len(sections))
    if count >= len(sections):
        return sections[:count]

    # Distribute cleanly across beginning-middle, middle, and later body sections
    selected: List[Dict[str, Any]] = []
    used_indices: Set[int] = set()
    step = len(sections) / float(count)
    for k in range(count):
        pos = min(len(sections) - 1, int(round(k * step + (step * 0.25))))
        while pos in used_indices and pos + 1 < len(sections):
            pos += 1
        if pos not in used_indices:
            used_indices.add(pos)
            selected.append(sections[pos])
    return selected


def _fallback_english_query(text: str, role: str, idx: int = 0) -> str:
    lower = (text or "").lower()
    for keywords, eng_query in _FALLBACK_QUERY_MAP:
        if any(k in lower for k in keywords):
            if role == "featured":
                return eng_query
            return eng_query
    defaults = [
        "software developer laptop",
        "office team meeting",
        "server rack datacenter",
        "web design workspace",
    ]
    return defaults[idx % len(defaults)]


def _sanitize_alt_caption(text: str, fallback: str, max_len: int) -> str:
    clean = re.sub(r"\s+", " ", str(text or "")).strip().strip('"').strip("'")
    if len(clean) < 10:
        clean = fallback
    return clean[:max_len]


def plan_image_requirements(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyzes article title, primary keyword, pillar, audience, and section headings
    to generate distinct contextual image search queries and SEO metadata.
    """
    title = str(payload.get("title") or "").strip()
    target_keyword = str(payload.get("target_keyword") or title).strip()
    target_audience = str(payload.get("target_audience") or "Pemilik bisnis, UMKM, dan tim IT di Indonesia").strip()
    content = str(payload.get("content") or "")
    pillar = payload.get("pillar") if isinstance(payload.get("pillar"), dict) else {}
    pillar_name = str(pillar.get("name") or payload.get("pillar_code") or "Teknologi & Software")
    language = str(payload.get("language") or "id").lower()
    featured_hint = str(payload.get("featured_image_recommendation") or "").strip()
    existing_alt = str(payload.get("featured_image_alt") or "").strip()

    max_images = max(1, min(6, int(payload.get("max_images_per_article") or 4)))
    max_inline = max(0, max_images - 1)

    all_sections = extract_sections_from_html(content)
    # Keep inline images proportional: e.g. <= 1 image per ~2 valid sections
    proportional_max = max(1, len(all_sections) // 2) if all_sections else 0
    if max_inline > 0 and all_sections:
        target_inline_count = min(max_inline, max(1, min(3, proportional_max)))
    else:
        target_inline_count = 0

    chosen_sections = _pick_balanced_sections(all_sections, target_inline_count)

    lang_label = "Bahasa Indonesia" if language != "en" else "English"
    section_lines = "\n".join(
        f"- section_index={s['section_index']}: heading=\"{s['heading']}\" | ringkasan=\"{s['summary']}\""
        for s in chosen_sections
    ) or "- (Tidak ada subheading terpisah; fokus pada Featured Image saja)"

    prompt = f"""Kamu adalah Visual Editor & SEO Content Strategist profesional untuk 1sLabs (agensi web development, custom software, hosting, dan IT consulting).

Analisa artikel berikut dan rancang kebutuhan gambar (1 Featured Image + {len(chosen_sections)} Inline Section Images).

METADATA ARTIKEL:
- Judul: {title}
- Primary Keyword: {target_keyword}
- Content Pillar: {pillar_name}
- Target Audience: {target_audience}
- Arahan Visual Awal: {featured_hint or '-'}
- Bahasa Alt/Caption Output: {lang_label}

BAGIAN ARTIKEL YANG BUTUH VISUAL PENDUKUNG:
{section_lines}

ATURAN WAJIB:
1. Untuk stock photo search (`search_query` dan `secondary_query`), WAJIB gunakan BAHASA INGGRIS yang RINGKAS (TEPAT 2 sampai 3 kata benda konkret saja, mis. "server rack datacenter", "software developer laptop", "business team meeting", "web design desk"). JANGAN menulis frasa panjang 5-7 kata seperti "it professionals analyzing dashboard", dan JANGAN menggunakan kata abstrak ("banner", "clipart", atau judul bahasa Indonesia).
2. DILARANG mengulang konsep gambar yang sama antara featured image dan tiap inline image. Setiap slot HARUS merepresentasikan adegan visual yang berbeda sesuai konteks heading-nya.
3. Hindari konsep gambar yang cenderung memunculkan teks acak, meme, atau watermark.
4. `alt_text` dan `caption` ditulis dalam {lang_label} yang alami, informatif, bebas keyword stuffing, relevan dengan konteks pembaca.
5. `ai_prompt` ditulis dalam bahasa Inggris deskriptif (clean photorealistic editorial scene, natural lighting, modern workspace/tech environment, explicitly "no text, no watermark, no logos") hanya untuk cadangan darurat jika stock API gagal.

Kembalikan HANYA JSON valid sesuai skema berikut:
{{
  "visual_theme": "ringkasan tema visual artikel",
  "featured": {{
    "search_query": "concise english stock search query 4-7 words",
    "secondary_query": "alternative english query 4-6 words",
    "visual_style": "editorial photography",
    "subject": "subjek visual utama",
    "alt_text": "Alt text deskriptif untuk featured image (40-120 karakter)",
    "caption": "Caption singkat yang menjelaskan konteks visual utama",
    "ai_prompt": "Editorial wide-angle photograph of ..., no text, no watermark, no logos"
  }},
  "inline": [
    {{
      "section_index": 0,
      "section_heading": "Judul Heading H2 persis",
      "search_query": "distinct english stock search query for this section",
      "secondary_query": "alternative english query",
      "visual_style": "editorial photography",
      "subject": "subjek visual untuk bagian ini",
      "alt_text": "Alt text kontekstual untuk bagian ini",
      "caption": "Caption singkat mendukung pembahasan bagian ini",
      "ai_prompt": "Photorealistic scene depicting ..., no text, no logos"
    }}
  ]
}}"""

    llm_data, model_used = call_llm_json(prompt, role="REASONING")
    used_queries: Set[str] = set()

    def build_slot_defaults(raw_slot: Any, fallback_ctx: str, role: str, idx: int, section_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        slot = raw_slot if isinstance(raw_slot, dict) else {}
        q1 = _compact_stock_query(str(slot.get("search_query") or ""), max_words=3)
        if len(q1.split()) < 2 or q1.lower() in used_queries:
            q1 = _fallback_english_query(fallback_ctx, role, idx)
        if q1.lower() in used_queries:
            q1 = f"{q1.split()[0]} workspace" if role != "featured" else q1
        used_queries.add(q1.lower())

        q2 = _compact_stock_query(str(slot.get("secondary_query") or ""), max_words=2)
        if len(q2.split()) < 2 or q2.lower() == q1.lower():
            q2 = _fallback_english_query(f"{pillar_name} {fallback_ctx}", role, idx + 1)

        alt_fallback = (
            existing_alt
            if role == "featured" and len(existing_alt) >= 12
            else (
                f"Ilustrasi {section_info['heading']}" if section_info else f"Ilustrasi utama {title[:90]}"
            )
        )
        alt_text = _sanitize_alt_caption(slot.get("alt_text"), alt_fallback, 160)
        caption = _sanitize_alt_caption(
            slot.get("caption"),
            section_info["heading"] if section_info else f"Visual pendukung pembahasan {title[:110]}",
            220,
        )
        ai_prompt = str(slot.get("ai_prompt") or "").strip()
        if len(ai_prompt) < 15:
            ai_prompt = f"Clean modern editorial photograph illustrating {q1}, soft natural office lighting, shallow depth of field, high resolution, 16:9 composition, strictly no text, no letters, no watermark, no logos"
        elif "no text" not in ai_prompt.lower():
            ai_prompt = f"{ai_prompt}, strictly no text, no watermark, no logos"

        out: Dict[str, Any] = {
            "role": role,
            "search_query": q1[:100],
            "secondary_query": q2[:100],
            "visual_style": str(slot.get("visual_style") or "editorial photography")[:60],
            "subject": str(slot.get("subject") or q1)[:160],
            "alt_text": alt_text,
            "caption": caption,
            "ai_prompt": ai_prompt[:450],
        }
        if section_info:
            out["section_index"] = int(section_info["section_index"])
            out["section_heading"] = section_info["heading"]
        return out

    raw_featured = llm_data.get("featured") if isinstance(llm_data, dict) else {}
    featured_plan = build_slot_defaults(
        raw_featured,
        f"{title} {target_keyword} {pillar_name} {featured_hint}",
        "featured",
        0,
        None,
    )

    raw_inline_list = llm_data.get("inline") if isinstance(llm_data, dict) and isinstance(llm_data.get("inline"), list) else []
    inline_plans: List[Dict[str, Any]] = []
    for idx, sec in enumerate(chosen_sections):
        matched_llm = None
        for cand in raw_inline_list:
            if isinstance(cand, dict) and cand.get("section_index") == sec["section_index"]:
                matched_llm = cand
                break
        if matched_llm is None and idx < len(raw_inline_list):
            matched_llm = raw_inline_list[idx]
        inline_plans.append(
            build_slot_defaults(
                matched_llm,
                f"{sec['heading']} {sec['summary']} {pillar_name}",
                "inline",
                idx + 1,
                sec,
            )
        )

    return {
        "visual_theme": str((llm_data or {}).get("visual_theme") or f"Visual editorial profesional untuk {pillar_name}")[:240],
        "model_used": model_used or "deterministic_fallback",
        "featured": featured_plan,
        "inline": inline_plans,
        "total_h2_sections": len(all_sections),
    }


def _score_candidate_deterministic(
    candidate: Dict[str, Any],
    query_terms: List[str],
    role: str,
    min_width: int,
    min_height: int,
    preferred_aspect: str,
) -> float:
    text_blob = " ".join(
        str(candidate.get(k) or "")
        for k in ("title", "description", "alt", "tags")
    ).lower()
    url_lower = str(candidate.get("original_url") or "").lower()

    # Hard rejection checks
    if not url_lower.startswith("https://"):
        return -1000.0
    if any(ext in url_lower.split("?")[0] for ext in (".svg", ".gif", ".ico", ".tiff", ".tif", ".pdf")):
        return -1000.0
    if any(bad in text_blob or bad in url_lower for bad in _WATERMARK_OR_BAD_PATTERNS):
        return -500.0

    w = int(candidate.get("width") or 0)
    h = int(candidate.get("height") or 0)

    score = 50.0
    # Resolution check (allow unknown width on providers if 0, but boost known >= min_width)
    if w > 0 and h > 0:
        if w < max(400, int(min_width * 0.65)) or h < max(260, int(min_height * 0.65)):
            return -200.0
        if w >= min_width and h >= min_height:
            score += 20.0
        elif w >= 640 and h >= 360:
            score += 8.0

        ratio = w / float(h)
        if preferred_aspect == "16:9" or role == "featured":
            if 1.3 <= ratio <= 2.15:
                score += 18.0 - abs(ratio - 1.777) * 10.0
            elif ratio < 1.0:
                score -= 22.0 if role == "featured" else 8.0
        elif 0.8 <= ratio <= 2.2:
            score += 8.0

    # Query keyword overlap
    matched_terms = sum(1 for t in query_terms if len(t) >= 3 and t in text_blob)
    score += min(28.0, matched_terms * 7.5)

    # Provider quality tier preference (clean curated photography first)
    provider = str(candidate.get("provider") or "").lower()
    provider_bonus = {
        "unsplash": 14.0,
        "pexels": 13.0,
        "pixabay": 11.0,
        "openverse": 6.0,
        "wikimedia": 4.0,
    }.get(provider, 0.0)
    score += provider_bonus

    # Slight penalty for overly long filename/technical metadata looking like scanned doc
    if any(w_bad in text_blob for w_bad in ("screenshot", "chart of", "diagram of", "scan ", "page 1", "table of")):
        score -= 10.0

    return round(score, 2)


def rank_and_select_candidates(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filters, scores, and optionally AI-reranks candidate stock images to pick the best
    unused visual without watermarks, low-res thumbnails, or off-topic content.
    """
    requirement = payload.get("requirement") if isinstance(payload.get("requirement"), dict) else {}
    candidates = payload.get("candidates") if isinstance(payload.get("candidates"), list) else []
    used_urls_raw = payload.get("used_urls") if isinstance(payload.get("used_urls"), list) else []
    used_urls = {str(u).strip().lower() for u in used_urls_raw if u}

    role = str(requirement.get("role") or "inline")
    search_query = str(requirement.get("search_query") or payload.get("search_query") or "").strip()
    section_heading = str(requirement.get("section_heading") or "").strip()
    article_title = str(payload.get("title") or "").strip()
    min_width = int(payload.get("min_width") or 800)
    min_height = int(payload.get("min_height") or 450)
    preferred_aspect = str(payload.get("preferred_aspect") or "16:9")
    use_llm_rerank = bool(payload.get("use_llm_rerank", True))

    query_terms = [t.lower() for t in re.split(r"[\s,_-]+", search_query) if t.strip()]

    scored: List[Tuple[float, Dict[str, Any]]] = []
    for cand in candidates:
        if not isinstance(cand, dict):
            continue
        url = str(cand.get("original_url") or "").strip()
        if not url or url.lower() in used_urls:
            continue
        s = _score_candidate_deterministic(cand, query_terms, role, min_width, min_height, preferred_aspect)
        if s > 0:
            scored.append((s, cand))

    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored:
        return {"selected": None, "ranked": [], "reason": "Tidak ada kandidat valid memenuhi filter resolusi & lisensi."}

    top_finalists = scored[:5]
    chosen_idx = 0
    reason = f"Dipilih berdasarkan kesesuaian query '{search_query}', rasio lanskap, dan kualitas provider."

    # Use AI semantic check when there are >= 2 close candidates to prevent off-topic picks
    if use_llm_rerank and len(top_finalists) >= 2 and (os.getenv("GEMINI_API_KEY") or "").strip():
        cand_summaries = "\n".join(
            f"[{i}] provider={c.get('provider')} | size={c.get('width')}x{c.get('height')} | title=\"{str(c.get('title') or '')[:90]}\" | desc=\"{str(c.get('description') or c.get('alt') or '')[:120]}\""
            for i, (_score, c) in enumerate(top_finalists)
        )
        rerank_prompt = f"""Pilih 1 indeks gambar PALING RELEVAN secara visual dan profesional untuk artikel IT/bisnis.
Judul artikel: {article_title}
Posisi gambar: {role} {f'(Bagian: {section_heading})' if section_heading else '(Gambar Hero Utama)'}
Target visual dicari: {search_query}

Kandidat:
{cand_summaries}

Kriteria tolak: hindari gambar benda tidak nyambung, selfie, gambar dokumen/scan buram, meme, atau logo merek lain.
Jawab JSON valid saja:
{{"best_index": 0, "relevance_score": 88, "reason": "alasan singkat dalam bahasa Indonesia"}}"""
        rr_json, _ = call_llm_json(rerank_prompt, role="LIGHTWEIGHT")
        if isinstance(rr_json, dict) and isinstance(rr_json.get("best_index"), int):
            idx = rr_json["best_index"]
            if 0 <= idx < len(top_finalists):
                chosen_idx = idx
                if rr_json.get("reason"):
                    reason = str(rr_json["reason"])[:240]

    selected_score, selected = top_finalists[chosen_idx]
    ranked_out = [
        {**c, "relevance_score": sc}
        for sc, c in scored[:6]
    ]
    return {
        "selected": {**selected, "relevance_score": selected_score},
        "ranked": ranked_out,
        "reason": reason,
    }


def optimize_image_binary(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates binary image using Pillow, applies EXIF transpose, optional landscape
    framing refinement, resizes safely within max_width, and encodes as WebP or JPEG.
    """
    b64 = str(payload.get("image_base64") or "").strip()
    if not b64:
        raise ValueError("image_base64 wajib diisi.")
    if "," in b64 and b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]

    raw_bytes = base64.b64decode(b64)
    if len(raw_bytes) < 512:
        raise ValueError("Ukuran file gambar terlalu kecil / korup.")

    preferred_format = str(payload.get("preferred_format") or "webp").lower()
    if preferred_format not in ("webp", "jpeg", "jpg"):
        preferred_format = "webp"
    max_width = max(480, min(2000, int(payload.get("max_width") or 1440)))
    min_accept_width = max(320, int(payload.get("min_accept_width") or 400))
    crop_aspect = bool(payload.get("crop_aspect", False))
    target_aspect = str(payload.get("target_aspect") or "16:9")

    with Image.open(io.BytesIO(raw_bytes)) as img:
        img.load()
        img = ImageOps.exif_transpose(img)
        orig_w, orig_h = img.size
        if orig_w < min_accept_width or orig_h < 220:
            raise ValueError(f"Resolusi gambar terlalu kecil ({orig_w}x{orig_h}px).")

        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            rgba = img.convert("RGBA")
            bg.paste(rgba, mask=rgba.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Gentle aspect refinement for featured hero cards (target ~16:9) without aggressive slicing
        if crop_aspect and target_aspect == "16:9":
            w, h = img.size
            current_ratio = w / float(h)
            target_ratio = 16.0 / 9.0
            if current_ratio < 1.25:
                new_h = max(240, int(round(w / 1.55)))
                top = max(0, (h - new_h) // 2)
                img = img.crop((0, top, w, top + new_h))
            elif current_ratio > 2.35:
                new_w = max(360, int(round(h * target_ratio)))
                left = max(0, (w - new_w) // 2)
                img = img.crop((left, 0, left + new_w, h))

        w, h = img.size
        if w > max_width:
            new_h = max(1, int(round(h * (max_width / float(w)))))
            img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()
        if preferred_format == "webp":
            img.save(out_buf, format="WEBP", quality=84, method=4)
            out_fmt = "webp"
            mime = "image/webp"
        else:
            img.save(out_buf, format="JPEG", quality=85, optimize=True, progressive=True)
            out_fmt = "jpg"
            mime = "image/jpeg"

        final_bytes = out_buf.getvalue()
        final_w, final_h = img.size

    return {
        "success": True,
        "format": out_fmt,
        "mime_type": mime,
        "width": final_w,
        "height": final_h,
        "size_bytes": len(final_bytes),
        "base64_data": base64.b64encode(final_bytes).decode("ascii"),
    }


def _extract_image_bytes_from_genai_response(response: Any) -> Optional[bytes]:
    candidates = getattr(response, "candidates", None) or []
    for cand in candidates:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and getattr(inline_data, "data", None):
                data = inline_data.data
                if isinstance(data, bytes):
                    return data
                if isinstance(data, str):
                    return base64.b64decode(data)
    return None


def generate_ai_image_fallback(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Optional AI Image Generation fallback via Gemini Image API when stock providers
    fail or return no suitable image. Strictly produces editorial/technical visuals
    with zero embedded random text or watermarks, then optimizes via Pillow.
    """
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("Prompt gambar AI fallback tidak boleh kosong.")
    if "no text" not in prompt.lower():
        prompt = f"{prompt}. Editorial photography style, realistic lighting, crisp detail, 16:9 widescreen composition, strictly no text, no typography, no letters, no logos, no watermarks."

    preferred_format = str(payload.get("preferred_format") or "webp").lower()
    max_width = int(payload.get("max_width") or 1280)
    primary_model = os.getenv("IMAGE_GEMINI_MODEL", "gemini-2.5-flash-image").strip() or "gemini-2.5-flash-image"
    candidate_models = [primary_model]
    for m in ("gemini-2.5-flash-image", "gemini-3.1-flash-image"):
        if m not in candidate_models:
            candidate_models.append(m)

    client = get_genai_client()
    raw_bytes: Optional[bytes] = None
    used_model: Optional[str] = None
    last_err = ""

    for model_name in candidate_models:
        try:
            config = types.GenerateContentConfig(response_modalities=["IMAGE"])
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            extracted = _extract_image_bytes_from_genai_response(response)
            if extracted and len(extracted) > 1000:
                raw_bytes = extracted
                used_model = model_name
                break
        except Exception as exc:
            last_err = _sanitize_error(str(exc))
            continue

    if not raw_bytes:
        raise RuntimeError(last_err or "Gemini Image Fallback tidak menghasilkan gambar.")

    optimized = optimize_image_binary({
        "image_base64": base64.b64encode(raw_bytes).decode("ascii"),
        "preferred_format": preferred_format,
        "max_width": max_width,
        "min_accept_width": 400,
        "crop_aspect": bool(payload.get("crop_aspect", True)),
        "target_aspect": "16:9",
    })
    optimized["model_used"] = used_model
    optimized["provider"] = "gemini_ai"
    return optimized

