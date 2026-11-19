"""
1sLabs Service-Oriented Content Generation & Topic Research Pipeline

Adapts the local article-generator LLM and research capabilities for 1sLabs
(`https://1slabs.my.id/`) without touching or polluting Inpartner's database rows.
All 1sLabs company facts, services, pricing boundaries, and internal links are
grounded strictly in the verified Company Knowledge Base supplied per request.
"""

from __future__ import annotations

import json
import os
import re
import time
import unicodedata
from typing import Any, Callable, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup

from services.llm_client import call_llm, call_llm_json, _sanitize_error

# Optional web research import (gracefully skipped for offline or pure evergreen runs)
try:
    from services.research_engine import discover_sources_multi_query  # type: ignore
except Exception:
    discover_sources_multi_query = None


DEFAULT_INTERNAL_LINKS = [
    {"label": "Layanan Managed Cloud Hosting 1sLabs", "path": "/hosting"},
    {"label": "Program Free Plan & Subdomain Gratis", "path": "/portal?tab=freeplan"},
    {"label": "Jasa Pembuatan Website Pay Once", "path": "/jasa-pembuatan-website"},
    {"label": "Custom Software Development", "path": "/software-development"},
    {"label": "Konsultasi IT Gratis", "path": "/it-consulting"},
    {"label": "Pusat Dokumentasi Teknis", "path": "/docs"},
    {"label": "Jadwalkan Diskusi Online", "path": "/schedule"},
]

ANTI_SLOP_RULES = """
ATURAN PENULISAN KETAT (ANTI-AI-SLOP):
1. JANGAN gunakan pembukaan klise seperti "Di era digital saat ini...", "Seiring perkembangan teknologi yang pesat...", "Dalam dunia bisnis modern...". Mulai langsung ke masalah konkret atau data/langkah praktis.
2. JANGAN memakai simbol em-dash ("—") maupun tanda seru berlebihan. Gunakan titik, koma, atau tanda kurung secara wajar.
3. Hindari jargon promosi kosong: "revolusioner", "terdepan", "solusi terbaik nomor 1", "all-in-one solution", "seamless", "unlock your potential".
4. Gunakan suara praktisi engineer Indonesia yang lugas, jelas, objektif, dan bervariasi dalam panjang kalimat.
5. Jangan menggunakan daftar tiga hal yang selalu simetris di setiap paragraf.
6. Jangan pernah memalsukan statistik, persentase keberhasilan, nama testimoni klien, angka klien ("200+ klien", "500+ proyek", "10+ tahun"), atau "aktivasi instan".
""".strip()


def slugify_text(text: str) -> str:
    value = unicodedata.normalize("NFKD", str(text or ""))
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value).strip("-")
    return value[:140] or "artikel-1slabs"


def _strip_html(html_text: str) -> str:
    if not html_text:
        return ""
    soup = BeautifulSoup(html_text, "html.parser")
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


def _format_knowledge_context(kb: Dict[str, Any]) -> str:
    entries = kb.get("entries") or []
    verified_paths = kb.get("verified_paths") or [item["path"] for item in DEFAULT_INTERNAL_LINKS]
    lines: List[str] = ["=== KNOWLEDGE BASE TERVERIFIKASI 1SLABS ==="]
    for entry in entries:
        status = entry.get("verification_status", "verified")
        lines.append(
            f"\n[{entry.get('category_number', '-')}. {entry.get('category_label', '')}] "
            f"{entry.get('title', '')} (Status: {status})"
        )
        if entry.get("summary"):
            lines.append(f"Ringkasan: {entry['summary']}")
        for fact in entry.get("facts") or []:
            if isinstance(fact, str):
                lines.append(f"- {fact}")
                continue
            f_status = fact.get("status", "verified")
            tag = "[TERVERIFIKASI]" if f_status == "verified" else "[JANGAN JADIKAN KLAIM PASTI / PERLU KONFIRMASI]"
            lines.append(f"- {fact.get('label')}: {fact.get('value')} {tag}")
    lines.append("\n=== PATH HALAMAN INTERNAL 1SLABS YANG VALID ===")
    lines.append(", ".join(verified_paths))
    lines.append("\n=== KLAIM YANG DILARANG KERAS ===")
    for rule in kb.get("forbidden_claims") or []:
        lines.append(f"- DILARANG: {rule.get('label')} ({rule.get('reason')})")
    return "\n".join(lines)


def _apply_justified_alignment_to_soup(soup: BeautifulSoup) -> None:
    """Apply `text-align: justify;` to body paragraphs outside CTA/table/figure elements."""
    for p_tag in soup.find_all("p"):
        if p_tag.find_parent(class_="oneslabs-cta-block") or p_tag.find_parent(["table", "figure", "figcaption"]):
            continue
        existing_style = str(p_tag.get("style") or "").strip()
        if "text-align" in existing_style.lower():
            continue
        if existing_style and not existing_style.endswith(";"):
            existing_style += ";"
        p_tag["style"] = f"{existing_style} text-align: justify;".strip()


def _normalize_article_html(
    raw_html: str,
    focus_keyphrase: str,
    pillar: Dict[str, Any],
    existing_articles: List[Dict[str, Any]],
) -> Tuple[str, List[str]]:
    """
    Normalizes HTML so it renders cleanly inside `.oneslabs-blog-prose` and TipTap:
    - Converts any <h1> inside body into <h2>
    - Strips <script>/<style>
    - Applies justified alignment (`text-align: justify;`) to body paragraphs
    - Ensures valid internal links & relevant CTA block
    """
    warnings: List[str] = []
    if not raw_html or not raw_html.strip():
        return "", ["Empty HTML output from model"]

    cleaned = raw_html.strip()
    # Unwrap accidental markdown code fences
    cleaned = re.sub(r"^```(?:html)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    soup = BeautifulSoup(cleaned, "html.parser")
    for bad in soup(["script", "style", "iframe", "object", "embed"]):
        bad.decompose()

    for h1 in soup.find_all("h1"):
        h1.name = "h2"

    # Remove AI-slop em-dashes safely from text nodes
    for text_node in soup.find_all(string=True):
        if "—" in text_node:
            text_node.replace_with(text_node.replace(" — ", ", ").replace("—", ", "))

    _apply_justified_alignment_to_soup(soup)
    body_html = str(soup).strip()

    # Ensure at least one valid internal link exists
    internal_hrefs = re.findall(r'href=["\'](/[^"\']*)["\']', body_html, flags=re.IGNORECASE)
    target_path = (pillar.get("primary_cta_path") or "/hosting").strip()
    if not target_path.startswith("/"):
        target_path = "/hosting"
    cta_label = pillar.get("primary_cta_label") or "Konsultasi & Cek Layanan 1sLabs"

    if len(internal_hrefs) < 2:
        secondary_link = "/docs"
        if existing_articles:
            first_slug = existing_articles[0].get("slug")
            if first_slug:
                secondary_link = f"/blog/{first_slug}"
        link_note = (
            f'<div class="callout-box" data-tone="tip">'
            f'<p style="text-align: justify;"><strong>Referensi Terkait:</strong> Anda dapat mempelajari panduan teknis lanjutan di '
            f'<a href="{secondary_link}">referensi dokumentasi &amp; artikel 1sLabs</a> atau meninjau '
            f'<a href="{target_path}">halaman layanan terkait</a> untuk implementasi langsung.</p>'
            f'</div>'
        )
        body_html += "\n" + link_note
        warnings.append("Added fallback internal reference links because draft contained fewer than 2 internal links.")

    if "oneslabs-cta-block" not in body_html and target_path not in body_html:
        cta_block = (
            f'<div class="oneslabs-cta-block">'
            f'<p>Butuh bantuan implementasi teknis atau ingin mencoba infrastruktur yang dibahas di atas?</p>'
            f'<a class="oneslabs-cta-btn" href="{target_path}">{cta_label}</a>'
            f'</div>'
        )
        body_html += "\n" + cta_block

    return body_html, warnings


def _detect_forbidden_claims(text: str, forbidden_rules: List[Dict[str, Any]]) -> List[str]:
    hits: List[str] = []
    plain = _strip_html(text)
    for rule in forbidden_rules or []:
        for pat in rule.get("regexes") or []:
            try:
                if re.search(pat, plain, flags=re.IGNORECASE):
                    hits.append(rule.get("label") or pat)
                    break
            except re.error:
                continue
    return hits


def generate_slabs_article(
    payload: Dict[str, Any],
    progress_cb: Optional[Callable[[str, int, str], None]] = None,
) -> Dict[str, Any]:
    """
    Runs a multi-stage service-oriented article generation workflow for 1sLabs.
    Stages:
      1. Intent & Knowledge Grounding
      2. Optional Supplementary Research (non-fatal on evergreen/offline topics)
      3. SEO & Content Strategy Brief
      4. Long-Form Composition (HTML compatible with .oneslabs-blog-prose)
      5. Self-Review, Factual Safety Scrub & FAQ Extraction
    """
    t0 = time.time()
    trace: List[Dict[str, Any]] = []
    warnings: List[str] = []

    topic = str(payload.get("topic") or "").strip()
    if not topic:
        raise ValueError("Topik artikel wajib diisi.")

    target_keyword = str(payload.get("target_keyword") or topic).strip()
    secondary_keywords = payload.get("secondary_keywords") or []
    pillar = payload.get("pillar") or {}
    language = (payload.get("language") or "id").lower()
    tone = payload.get("tone") or "practitioner_clear"
    word_count_target = max(650, min(2200, int(payload.get("word_count_target") or 1050)))
    search_intent = payload.get("search_intent") or pillar.get("search_intent") or "informational"
    enable_web_research = bool(payload.get("enable_web_research", False))
    kb = payload.get("knowledge_base") or {}
    existing_articles = payload.get("existing_articles") or []
    custom_instructions = str(payload.get("custom_instructions") or "").strip()

    def report(stage: str, pct: int, detail: str):
        trace.append({
            "stage": stage,
            "percent": pct,
            "detail": detail,
            "elapsed_ms": int((time.time() - t0) * 1000),
        })
        if progress_cb:
            progress_cb(stage, pct, detail)

    # ------------------------------------------------------------------
    # Stage 1: Intent & Knowledge Base Grounding
    # ------------------------------------------------------------------
    report("grounding", 15, "Memetakan niat pencarian dan fakta terverifikasi dari Knowledge Base 1sLabs...")
    kb_context = _format_knowledge_context(kb)
    existing_links_text = "\n".join(
        f"- {a.get('title')} (/blog/{a.get('slug')})"
        for a in existing_articles[:20]
        if a.get("title") and a.get("slug")
    ) or "- Belum ada artikel blog terdahulu (gunakan halaman layanan/docs 1sLabs)."

    # ------------------------------------------------------------------
    # Stage 2: Optional Web Research (Graceful Fallback for Evergreen Topics)
    # ------------------------------------------------------------------
    research_notes = ""
    if enable_web_research and discover_sources_multi_query is not None:
        report("research", 28, "Mencari referensi eksternal pelengkap untuk konteks industri...")
        try:
            queries = [topic, target_keyword]
            discovered = discover_sources_multi_query(queries=queries, max_results_per_query=3)
            snippets = []
            for item in (discovered or [])[:4]:
                title_s = item.get("title") or ""
                src_s = item.get("source") or item.get("publisher") or ""
                if title_s:
                    snippets.append(f"- {title_s} ({src_s})")
            if snippets:
                research_notes = "Referensi topik publik (hanya untuk konteks umum, BUKAN fakta layanan 1sLabs):\n" + "\n".join(snippets)
            else:
                warnings.append("Riset web tidak menemukan referensi baru; melanjutkan berbasis Knowledge Base 1sLabs.")
        except Exception as e:
            warnings.append(f"Riset web dilewati ({_sanitize_error(str(e))}); melanjutkan berbasis Knowledge Base 1sLabs.")
    else:
        report("research", 28, "Topik berorientasi layanan/panduan; menggunakan grounding Knowledge Base terverifikasi.")

    # ------------------------------------------------------------------
    # Stage 3: SEO Brief & Story Plan
    # ------------------------------------------------------------------
    report("seo_brief", 45, "Menyusun SEO Brief, struktur heading H2/H3, dan kerangka artikel...")
    lang_label = "Bahasa Indonesia" if language.startswith("id") else "English"
    pillar_name = pillar.get("name") or "Layanan & Infrastruktur 1sLabs"
    primary_cta_path = pillar.get("primary_cta_path") or "/hosting"
    primary_cta_label = pillar.get("primary_cta_label") or "Pelajari Layanan 1sLabs"

    brief_prompt = f"""
Kamu adalah Content Strategist dan Technical SEO Architect di 1sLabs (https://1slabs.my.id/).
Rancang brief terstruktur untuk artikel berorientasi solusi dan layanan.

INPUT TOPIK:
- Topik: {topic}
- Pilar Konten: {pillar_name}
- Focus Keyphrase Target: {target_keyword}
- Secondary Keywords: {", ".join(secondary_keywords) if secondary_keywords else "sesuaikan secara alami"}
- Search Intent: {search_intent}
- Bahasa Output: {lang_label}
- Gaya Bahasa: {tone}
- Target Jumlah Kata: ~{word_count_target} kata
- Halaman CTA Utama: {primary_cta_path} ("{primary_cta_label}")
- Instruksi Tambahan Admin: {custom_instructions or "-"}

{kb_context}

ARTIKEL BLOG TERBIT YANG BISA DITAUTKAN:
{existing_links_text}

{research_notes}

Kembalikan JSON VALID saja dengan struktur:
{{
  "recommended_title": "Judul artikel 50-62 karakter memuat focus keyphrase secara alami",
  "slug": "slug-url-seo-ramah-pendek",
  "focus_keyphrase": "{target_keyword}",
  "secondary_keyphrases": ["keyword 2", "keyword 3"],
  "meta_title": "Meta Title <= 60 karakter dengan keyphrase di awal",
  "meta_description": "Meta Description 130-152 karakter persuasif dan jujur",
  "excerpt": "Ringkasan 1-2 kalimat yang jelas untuk kartu blog",
  "target_audience": "Segmen audiens utama artikel (mis. Developer, Mahasiswa, Pemilik UMKM, IT Lead)",
  "recommended_category": "{pillar.get('category_slug') or 'web-development'}",
  "tags": ["tag 1", "tag 2", "tag 3"],
  "featured_image_recommendation": "Deskripsi singkat komposisi visual editorial/teknis untuk featured image",
  "featured_image_alt": "Teks alt gambar deskriptif <= 115 karakter tanpa keyword stuffing",
  "direct_answer_summary": "1 paragraf jawaban langsung 45-65 kata (ramah AI Overview / GEO)",
  "internal_links_plan": [
    {{"anchor": "teks anchor alami", "path": "{primary_cta_path}"}},
    {{"anchor": "teks anchor kedua", "path": "/docs"}}
  ],
  "outline_sections": [
    {{"heading": "H2 bagian 1", "subheadings": ["H3 opsional"], "key_points": ["poin 1", "poin 2"]}}
  ],
  "faq_candidates": [
    {{"question": "Pertanyaan relevan pengguna?", "answer": "Jawaban singkat berbasis fakta terverifikasi."}}
  ]
}}
""".strip()

    brief_data, brief_model = call_llm_json(brief_prompt, role="REASONING")
    if not isinstance(brief_data, dict) or not brief_data:
        detail = f"respons JSON tidak valid dari model {brief_model}" if brief_model else "semua kandidat model gagal atau timeout"
        raise RuntimeError(f"Engine gagal menyusun SEO Brief via Gemini: {detail}")

    # ------------------------------------------------------------------
    # Stage 4: Long-Form HTML Article Composition
    # ------------------------------------------------------------------
    report("composition", 70, "Menulis artikel lengkap dengan struktur SEO, GEO, readability, dan CTA relevan...")

    compose_prompt = f"""
Kamu adalah Senior Technical Writer di 1sLabs (Bandung, Indonesia).
Tulis artikel lengkap dan mendalam dalam {lang_label} berformat HTML bersih (TANPA wrapper <html>/<body>/<article>).

SPESIFIKASI BRIEF:
{json.dumps(brief_data, ensure_ascii=False, indent=2)}

{kb_context}

{ANTI_SLOP_RULES}

ATURAN FORMAT HTML & SEO/GEO WAJIB:
1. JANGAN gunakan tag <h1> di dalam body artikel. Mulai konten langsung dengan paragraf pembuka yang mengandung focus keyphrase "{brief_data.get('focus_keyphrase', target_keyword)}" di 100 kata pertama, lalu diikuti kotak ringkasan cepat `<div class="callout-box" data-tone="info"><p>...</p></div>`.
2. Gunakan minimal 4 tag <h2> yang terstruktur rapi (boleh memakai <h3> di dalamnya). Sekitar 40-60% heading H2 sebaiknya mengandung kata kunci utama atau variasinya.
3. Jaga panjang paragraf tetap ringkas (maksimal 3-4 kalimat per `<p>`) dan banyak kalimat <= 20 kata agar skor Readability tinggi. Gunakan kata transisi alami (mis. "Selanjutnya,", "Sebagai contoh,", "Oleh karena itu,", "Namun,").
4. Sertakan setidaknya 1 list (`<ul>` atau `<ol>`) dan jika membantu pembaca, 1 `<table>` perbandingan yang ringkas.
5. Sisipkan minimal 2 hingga 4 internal link `<a href="...">...</a>` HANYA ke path internal 1sLabs yang valid (contoh `{primary_cta_path}`, `/docs`, `/hosting`, `/portal?tab=freeplan`, `/jasa-pembuatan-website`, `/software-development`, `/it-consulting`, `/schedule`, atau `/blog/<slug>` yang tertera di daftar). DILARANG membuat link palsu atau 404.
6. Sertakan bagian FAQ menggunakan `<h2>Pertanyaan yang Sering Diajukan</h2>` berisi 3–4 tanya jawab ringkas, dan tutup dengan satu blok CTA relevan:
   `<div class="oneslabs-cta-block"><p>Ajakan konsultasi/aksi alami 1 kalimat...</p><a class="oneslabs-cta-btn" href="{primary_cta_path}">{primary_cta_label}</a></div>`
7. Target panjang teks sekitar {word_count_target} kata.
8. PENTING: Untuk item Knowledge Base bertanda `[JANGAN JADIKAN KLAIM PASTI / PERLU KONFIRMASI]` (seperti variasi harga atau durasi uji coba Free Plan), jelaskan kapabilitas secara akurat tanpa mengarang kepastian baru; arahkan ke halaman terkait untuk detail paket aktif.
9. Keluarkan HANYA HTML artikel bersih tanpa markdown fence ```html.
""".strip()

    raw_html, comp_model = call_llm(compose_prompt, role="COMPOSITION")
    if not raw_html or not str(raw_html).strip():
        detail = f"respons kosong dari model {comp_model}" if comp_model else "semua kandidat model gagal atau timeout"
        raise RuntimeError(f"Engine gagal menulis konten artikel via Gemini: {detail}")

    # ------------------------------------------------------------------
    # Stage 5: Editorial Scrubbing & Knowledge Safety Verification
    # ------------------------------------------------------------------
    report("verification", 90, "Memeriksa kepatuhan fakta Knowledge Base, struktur HTML, dan metadata SEO...")

    focus_kw = str(brief_data.get("focus_keyphrase") or target_keyword).strip()
    html_clean, norm_warnings = _normalize_article_html(
        raw_html=raw_html,
        focus_keyphrase=focus_kw,
        pillar=pillar,
        existing_articles=existing_articles,
    )
    warnings.extend(norm_warnings)

    forbidden_hits = _detect_forbidden_claims(html_clean, kb.get("forbidden_claims") or [])
    if forbidden_hits:
        warnings.append(f"Terdeteksi potensi klaim terlarang sebelum revisi akhir: {', '.join(forbidden_hits)}; menjalankan koreksi keamanan.")
        scrub_prompt = f"""
Perbaiki HTML artikel berikut agar MENGHAPUS semua klaim tidak terverifikasi berikut ini:
{", ".join(forbidden_hits)}

{kb_context}

Pertahankan struktur HTML, internal link, tabel, callout-box, CTA, serta focus keyphrase "{focus_kw}".
Kembalikan HANYA HTML yang sudah bersih.

HTML ARTIKEL:
{html_clean}
""".strip()
        fixed_html, _fix_model = call_llm(scrub_prompt, role="COMPOSITION")
        if fixed_html and str(fixed_html).strip():
            html_clean, more_warn = _normalize_article_html(fixed_html, focus_kw, pillar, existing_articles)
            warnings.extend(more_warn)

    faq_items = []
    for f in (brief_data.get("faq_candidates") or [])[:5]:
        q = str(f.get("question") or "").strip()
        a = str(f.get("answer") or "").strip()
        if q and a:
            faq_items.append({"question": q, "answer": a})

    title = str(brief_data.get("recommended_title") or topic).strip()[:190]
    meta_title = str(brief_data.get("meta_title") or title).strip()[:70]
    meta_desc = str(brief_data.get("meta_description") or brief_data.get("excerpt") or "").strip()[:165]
    slug = slugify_text(brief_data.get("slug") or title)
    secondary_list = [str(s).strip() for s in (brief_data.get("secondary_keyphrases") or []) if str(s).strip()]
    tags_list = [str(t).strip() for t in (brief_data.get("tags") or secondary_list) if str(t).strip()][:5]
    target_audience = str(brief_data.get("target_audience") or "Developer, UMKM, dan Pembuat Keputusan IT Indonesia").strip()[:240]
    recommended_category = str(brief_data.get("recommended_category") or pillar.get("category_slug") or "").strip()[:120]
    featured_image_recommendation = str(
        brief_data.get("featured_image_recommendation")
        or f"Ilustrasi editorial teknis bersih bertema {pillar_name} dengan aksen biru modern 1sLabs."
    ).strip()[:400]
    featured_image_alt = str(
        brief_data.get("featured_image_alt") or f"Ilustrasi teknis {title}"
    ).strip()[:150]

    plain_words = _strip_html(html_clean).split()
    internal_links_used = sorted(set(re.findall(r'href=["\'](/[^"\']*)["\']', html_clean)))

    report("completed", 100, "Draf artikel selesai disusun oleh engine generator.")

    return {
        "title": title,
        "slug": slug,
        "excerpt": str(brief_data.get("excerpt") or meta_desc).strip(),
        "meta_title": meta_title,
        "meta_description": meta_desc,
        "focus_keyphrase": focus_kw,
        "secondary_keyphrases": ", ".join(secondary_list),
        "target_audience": target_audience,
        "recommended_category": recommended_category,
        "tags": tags_list,
        "featured_image_recommendation": featured_image_recommendation,
        "featured_image_alt": featured_image_alt,
        "content": html_clean,
        "faq_items": faq_items,
        "word_count": len(plain_words),
        "internal_links_used": internal_links_used,
        "claims_warnings": _detect_forbidden_claims(html_clean, kb.get("forbidden_claims") or []),
        "generation_trace": trace,
        "warnings": warnings,
        "model_used": comp_model or brief_model or "gemini-pipeline",
        "elapsed_ms": int((time.time() - t0) * 1000),
    }


def research_topics_for_slabs(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates ranked, service-oriented 1sLabs topic candidates grounded in the
    Knowledge Base, selected content pillars, GSC opportunity queries, and existing
    published/queued articles to distribute topics evenly and prevent cannibalization.
    """
    kb = payload.get("knowledge_base") or {}
    pillars = payload.get("pillars") or []
    existing_titles = payload.get("existing_titles") or []
    existing_queue_titles = payload.get("existing_queue_titles") or []
    focus_pillar = str(payload.get("pillar_code") or "").strip()
    pillar_codes = [str(c).strip() for c in (payload.get("pillar_codes") or []) if str(c).strip()]
    if focus_pillar and focus_pillar not in pillar_codes:
        pillar_codes.append(focus_pillar)

    target_pillars = [p for p in pillars if not pillar_codes or p.get("code") in pillar_codes]
    if not target_pillars:
        target_pillars = pillars

    count = max(3, min(20, int(payload.get("count") or 6)))

    kb_context = _format_knowledge_context(kb)
    pillar_summary = "\n".join(
        f"- {p.get('code')}: {p.get('name')} ({p.get('description', '')}) | Intent: {p.get('default_intent')} | CTA: {p.get('primary_cta_path')}"
        for p in target_pillars
    ) or "Gunakan pilar layanan 1sLabs."

    requested_codes_label = (
        ", ".join(p.get("code", "") for p in target_pillars if p.get("code"))
        if target_pillars
        else (focus_pillar or "Semua pilar aktif")
    )
    avoid_titles = list(dict.fromkeys([*(existing_titles or []), *(existing_queue_titles or [])]))[:80]

    prompt = f"""
Kamu adalah Autonomous Content Strategist & Technical SEO Lead untuk 1sLabs (https://1slabs.my.id/).
Tugasmu adalah menemukan {count} topik artikel BARU berbahasa Indonesia secara mandiri yang berdampak langsung ke traffic organik, GEO AI Search, edukasi pasar, dan konversi layanan 1sLabs.

PILAR KONTEN YANG DIPILIH (DISTRIBUSIKAN SECARA SEIMBANG KE SELURUH PILAR INI):
{pillar_summary}
Kode Pilar Target: {requested_codes_label}

{kb_context}

DATA PELUANG DARI GOOGLE SEARCH CONSOLE (Jika Ada):
{json.dumps(payload.get("gsc_queries") or [], ensure_ascii=False)[:2500]}

ARTIKEL YANG SUDAH TERBIT ATAU SEDANG ANTRE/DRAFT (WAJIB DIHINDARI AGAR TIDAK DUPLIKAT ATAU KANIBAL):
{json.dumps(avoid_titles, ensure_ascii=False)}

ATURAN STRATEGIS:
1. Distribusikan {count} topik secara MERATA ke semua pilar pada daftar "PILAR KONTEN YANG DIPILIH". Jika ada 3 pilar dan {count} topik, jangan menumpuk hanya di 1 pilar.
2. Pilih search intent spesifik, problem-solution, perbandingan jujur, studi kasus terverifikasi, atau panduan implementasi yang mendorong calon klien mengeksplorasi layanan 1sLabs.
3. DILARANG mengarang klaim harga, durasi uji coba palsu, jumlah proyek/klien fiktif, atau produk yang tidak ditawarkan 1sLabs (mis. mobile app native).

Kembalikan JSON VALID saja dengan key "topics":
{{
  "topics": [
    {{
      "pillar_code": "kode pilar persis dari daftar di atas",
      "title": "Judul artikel spesifik, kuat SEO/GEO, belum pernah dibahas",
      "target_keyword": "focus keyphrase utama Indonesia",
      "secondary_keywords": ["kata kunci pendukung 1", "kata kunci pendukung 2"],
      "search_intent": "informational|commercial|transactional",
      "funnel_stage": "awareness|consideration|decision",
      "target_audience": "Target audiens spesifik",
      "service_target": "path layanan tujuan (/hosting, /portal?tab=freeplan, /jasa-pembuatan-website, /software-development, /it-consulting, /schedule)",
      "opportunity_score": 88,
      "rationale": "Alasan bisnis, kesenjangan konten, dan manfaat SEO"
    }}
  ]
}}
""".strip()

    data, research_model = call_llm_json(prompt, role="REASONING")
    if not isinstance(data, dict) or not isinstance(data.get("topics"), list):
        detail = f"format JSON tidak sesuai dari model {research_model}" if research_model else "semua kandidat model gagal atau timeout"
        raise RuntimeError(f"Gagal melakukan riset topik AI via Gemini: {detail}")

    return {"topics": data["topics"], "count": len(data["topics"]), "model_used": research_model}

