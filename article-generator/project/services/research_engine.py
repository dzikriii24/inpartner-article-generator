import os
import urllib.parse
import json
import re
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
import feedparser
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from database import safe_commit
from models import Source, NewsContent, NewsEmbedding
from services.llm_client import call_llm_json, call_llm, embed_texts
from services.clustering import cosine_sim

# Shared HTTP session with connection pooling for external scraping & API calls
_http_session = None


def get_http_session() -> requests.Session:
    global _http_session
    if _http_session is None:
        session = requests.Session()
        adapter = HTTPAdapter(pool_connections=8, pool_maxsize=8, max_retries=1)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        })
        _http_session = session
    return _http_session


# Known authoritative / official domains
PRIMARY_OFFICIAL_DOMAINS = [
    "bps.go.id", "kemenkeu.go.id", "bi.go.id", "setkab.go.id", "kemenperin.go.id",
    "kemendag.go.id", "gov", "org", "ac.id", "edu", "who.int", "worldbank.org"
]

MAJOR_REPUTABLE_PUBLISHERS = [
    "reuters", "bloomberg", "antara", "cnbc", "kompas", "detik", "kontan", "bisnis.com",
    "the wall street journal", "wsj", "bbc", "financial times", "tempo", "jawapos"
]

MAX_HTML_BYTES = 512 * 1024  # 512 KB cap per scraped page to protect RAM
MAX_STORED_CONTENT_CHARS = 6000
MAX_DISCOVERED_SOURCES = 8


def extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""


def evaluate_source_reliability(url: str, publisher: str) -> int:
    """
    1 = Official government / research institute / primary source
    2 = Major reputable news publisher
    3 = Industry publication
    4 = General blog / web source
    """
    domain = extract_domain(url)
    pub_lower = (publisher or "").lower()

    for off_dom in PRIMARY_OFFICIAL_DOMAINS:
        if off_dom in domain:
            return 1

    for maj_pub in MAJOR_REPUTABLE_PUBLISHERS:
        if maj_pub in pub_lower or maj_pub in domain:
            return 2

    return 3


def extract_article_content_clean(url: str) -> dict:
    """
    Fetch web content with strict timeout & byte cap, clean boilerplate,
    and close HTTP responses & BeautifulSoup trees to prevent memory leaks.
    """
    result = {
        "text": "",
        "author": None,
        "published_at": None,
        "title": None
    }
    if not url or "news.google.com/rss/articles/" in url:
        return result

    session = get_http_session()
    resp = None
    soup = None
    try:
        resp = session.get(url, timeout=6, stream=True)
        if resp.status_code == 200:
            content_type = (resp.headers.get("Content-Type") or "").lower()
            if "text/html" in content_type or "application/xhtml" in content_type or not content_type:
                raw_bytes = resp.raw.read(MAX_HTML_BYTES, decode_content=True)
                soup = BeautifulSoup(raw_bytes, 'html.parser')

                for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "form", "noscript", "svg"]):
                    element.decompose()

                author_meta = (
                    soup.find("meta", attrs={"name": re.compile(r'author', re.I)})
                    or soup.find("meta", attrs={"property": re.compile(r'author', re.I)})
                )
                if author_meta and author_meta.get("content"):
                    result["author"] = author_meta["content"].strip()[:100]

                paragraphs = soup.find_all('p')
                clean_paragraphs = [p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 25]
                text_content = "\n\n".join(clean_paragraphs)

                text_content = "".join(c for c in text_content if ord(c) <= 0xFFFF)
                result["text"] = text_content[:MAX_STORED_CONTENT_CHARS]
    except Exception as e:
        print(f"[ResearchEngine] Content extraction skipped for {url[:80]}: {e}")
    finally:
        if soup is not None:
            try:
                soup.decompose()
            except Exception:
                pass
        if resp is not None:
            try:
                resp.close()
            except Exception:
                pass

    return result


def analyze_topic_intent(user_prompt: str) -> dict:
    """
    Parse user prompt into topic name, geographic scope, timeframe, key subtopics,
    research questions, and search queries in EN & ID.
    """
    prompt = f"""
    You are a Lead AI Research Strategist.
    Analyze the following user prompt for a research-driven news article:
    "{user_prompt}"
    
    Deconstruct the prompt into a structured research plan:
    1. topic_name: Clear topic title.
    2. category: Business & Economy / Tech & AI / Market & Finance / Policy / World / Society.
    3. geographic_scope: Specific country/region (e.g., "Indonesia", "Global", "Southeast Asia").
    4. timeframe: "Recent News (Last 30 Days)" or specific timeframe if mentioned.
    5. target_angle: Precise narrative angle requested by user.
    6. subtopics: List 4-6 crucial subtopics (e.g. raw material costs, impact on UMKM, consumer purchasing power, supply chain, government policies).
    7. research_questions: 3-5 specific questions that MUST be answered with facts in the research.
    8. search_queries_en: List of 2 distinct search query strings in English covering general news and statistics/data.
    9. search_queries_id: List of 2 distinct search query strings in Indonesian covering news and BPS/data.
    
    Output strictly a JSON object:
    {{
        "topic_name": "...",
        "category": "...",
        "geographic_scope": "...",
        "timeframe": "...",
        "target_angle": "...",
        "subtopics": ["...", "..."],
        "research_questions": ["...", "..."],
        "search_queries_en": ["...", "..."],
        "search_queries_id": ["...", "..."]
    }}
    """

    parsed, model_used = call_llm_json(prompt, role="LIGHTWEIGHT")
    if parsed and isinstance(parsed, dict) and "topic_name" in parsed:
        print(f"[ResearchEngine] Topic intent analyzed using {model_used}")
        for key in ["subtopics", "research_questions", "search_queries_en", "search_queries_id"]:
            if key in parsed:
                if isinstance(parsed[key], str):
                    parsed[key] = [parsed[key]]
                elif not isinstance(parsed[key], list):
                    parsed[key] = []
            else:
                parsed[key] = []
        return parsed

    return {
        "topic_name": user_prompt,
        "category": "Business & Economy",
        "geographic_scope": "Indonesia",
        "timeframe": "Recent News",
        "target_angle": user_prompt,
        "subtopics": [user_prompt, "Dampak Ekonomi", "Biaya Produksi", "Tanggapan Pihak Terkait"],
        "research_questions": [f"Apa penyebab utama {user_prompt}?", f"Bagaimana dampaknya terhadap pihak terkait?", "Berapa data/angka statistik terbarunya?"],
        "search_queries_en": [user_prompt, f"{user_prompt} statistics data"],
        "search_queries_id": [user_prompt, f"{user_prompt} BPS data"]
    }


def discover_sources_multi_query(db: Session, intent: dict) -> list[Source]:
    """
    Executes bounded search across top query variations via Google News RSS and GNews API.
    Performs all external HTTP scraping and embedding BEFORE opening DB transactions
    so MySQL connections are never held idle across network calls (preventing error 2006).
    """
    try:
        db.close()
    except Exception:
        pass

    raw_queries = (
        intent.get("search_queries_id", [])[:2]
        + intent.get("search_queries_en", [])[:1]
        + [intent.get("topic_name", "")]
    )
    queries = []
    for q in raw_queries:
        if q and isinstance(q, str) and len(q.strip()) >= 3 and q.strip() not in queries:
            queries.append(q.strip())
        if len(queries) >= 3:
            break

    candidate_items = []
    seen_urls = set()
    session = get_http_session()

    # 1. Google News RSS search in memory (no DB connection held)
    for q in queries:
        if len(candidate_items) >= MAX_DISCOVERED_SOURCES:
            break

        encoded = urllib.parse.quote(q)
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=id-ID&gl=ID&ceid=ID:id"

        resp = None
        try:
            resp = session.get(rss_url, timeout=6)
            if resp.status_code != 200:
                continue
            parsed_feed = feedparser.parse(resp.content)
            for entry in parsed_feed.entries[:4]:
                if len(candidate_items) >= MAX_DISCOVERED_SOURCES:
                    break
                url = getattr(entry, "link", None)
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                pub_title = entry.get('source', {}).get('title', 'Google News') if isinstance(entry.get('source'), dict) else 'Google News'
                rel = evaluate_source_reliability(url, pub_title)
                domain = extract_domain(url)

                raw_summary = entry.get('summary', '')
                clean_summary = re.sub(r'<[^>]+>', '', raw_summary).strip()[:1000]

                extracted = extract_article_content_clean(url)
                full_text = (extracted["text"] if extracted["text"] else clean_summary)[:MAX_STORED_CONTENT_CHARS]

                candidate_items.append({
                    "url": url,
                    "title": (getattr(entry, "title", "") or "News Source")[:490],
                    "publisher": pub_title[:100],
                    "description": clean_summary,
                    "image_url": None,
                    "source_type": "gnews_rss",
                    "reliability": rel,
                    "source_domain": domain,
                    "author": extracted.get("author"),
                    "full_text": full_text
                })
        except Exception as e:
            print(f"[ResearchEngine] RSS Search error for query '{q[:50]}': {e}")
        finally:
            if resp is not None:
                try:
                    resp.close()
                except Exception:
                    pass

    # 2. GNews API search in memory if needed
    api_key = os.getenv("GNEWS_API_KEY")
    if api_key and len(candidate_items) < 6 and queries:
        resp = None
        try:
            primary_term = urllib.parse.quote(intent.get("topic_name", queries[0]))
            gnews_url = f"https://gnews.io/api/v4/search?q={primary_term}&lang=id&apikey={api_key}"
            resp = session.get(gnews_url, timeout=7)
            if resp.status_code == 200:
                articles = resp.json().get('articles', [])
                for a in articles[:4]:
                    if len(candidate_items) >= MAX_DISCOVERED_SOURCES:
                        break
                    url = a.get('url')
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)

                    pub_name = a.get('source', {}).get('name', 'GNews')
                    rel = evaluate_source_reliability(url, pub_name)
                    domain = extract_domain(url)

                    raw_desc = a.get('description', '') or ''
                    clean_desc = re.sub(r'<[^>]+>', '', raw_desc).strip()[:1000]

                    extracted = extract_article_content_clean(url)
                    full_text = (extracted["text"] if extracted["text"] else clean_desc)[:MAX_STORED_CONTENT_CHARS]

                    candidate_items.append({
                        "url": url,
                        "title": (a.get('title') or 'News Source')[:490],
                        "publisher": pub_name[:100],
                        "description": clean_desc,
                        "image_url": a.get('image'),
                        "source_type": "gnews_api",
                        "reliability": rel,
                        "source_domain": domain,
                        "author": extracted.get("author"),
                        "full_text": full_text
                    })
        except Exception as e:
            print(f"[ResearchEngine] GNews API error: {e}")
        finally:
            if resp is not None:
                try:
                    resp.close()
                except Exception:
                    pass

    if not candidate_items:
        return []

    # 3. Compute semantic relevance scores in memory BEFORE touching DB
    intent_text = f"{intent.get('topic_name')} {intent.get('target_angle')} {' '.join(intent.get('subtopics', []))}"
    src_texts = [f"{item['title']}. {item['full_text'][:600]}" for item in candidate_items]

    all_embs = embed_texts([intent_text] + src_texts)
    intent_emb = all_embs[0]
    for i, item in enumerate(candidate_items):
        item["relevance_score"] = round(cosine_sim(intent_emb, all_embs[i + 1]), 4)

    # 4. Fast batch persistence to DB (takes < 20ms)
    discovered_sources = []
    for item in candidate_items:
        existing = db.query(Source).filter(Source.url == item["url"]).first()
        if existing:
            existing.relevance_score = item["relevance_score"]
            existing._cached_text = item["full_text"]
            discovered_sources.append(existing)
            continue

        source = Source(
            url=item["url"],
            title=item["title"],
            publisher=item["publisher"],
            published_at=datetime.utcnow(),
            description=item["description"],
            image_url=item["image_url"],
            source_type=item["source_type"],
            reliability=item["reliability"],
            source_domain=item["source_domain"],
            author=item["author"],
            relevance_score=item["relevance_score"]
        )
        db.add(source)
        db.flush()

        news_content = NewsContent(
            source_id=source.id,
            full_content=item["full_text"],
            cleaned_content=item["full_text"],
            extracted_at=datetime.utcnow()
        )
        db.add(news_content)
        source._cached_text = item["full_text"]
        discovered_sources.append(source)

    safe_commit(db, release_conn=True)

    discovered_sources.sort(key=lambda s: (s.reliability or 3, -(s.relevance_score or 0.0)))
    return discovered_sources[:MAX_DISCOVERED_SOURCES]


def extract_facts_and_provenance(sources: list, intent: dict) -> list[dict]:
    """
    Extract atomic facts, statistics, numbers, quotes, entity names with exact source provenance.
    Optimized to process sources in batched LLM calls (up to 4 sources per call) without holding DB connections.
    """
    extracted_facts = []
    valid_source_entries = []

    for idx, s in enumerate(sources):
        text_val = getattr(s, "_cached_text", None)
        if not text_val:
            try:
                text_val = s.content_data.full_content if s.content_data and s.content_data.full_content else s.description
            except Exception:
                text_val = s.description or s.title
        text_val = (text_val or s.title or "").strip()
        if len(text_val) >= 20:
            valid_source_entries.append((idx, s, text_val[:1800]))

    batch_size = 4
    for b_start in range(0, len(valid_source_entries), batch_size):
        batch = valid_source_entries[b_start:b_start + batch_size]
        sources_block_lines = []
        batch_map = {}

        for local_i, (_, s, snippet) in enumerate(batch):
            batch_map[local_i] = s
            sources_block_lines.append(
                f"--- SOURCE [{local_i}] ---\n"
                f"Title: {s.title}\n"
                f"Publisher: {s.publisher} (Reliability: {s.reliability})\n"
                f"Content:\n{snippet}\n"
            )

        sources_block = "\n".join(sources_block_lines)

        prompt = f"""
        You are an expert Fact Extraction & Verification System.
        Topic: "{intent.get('topic_name')}"
        Target Angle: "{intent.get('target_angle')}"

        Below are {len(batch)} news sources:
        {sources_block}

        TASK:
        Extract verifiable, distinct atomic facts, statistics, dates, figures, entity names, official quotes, causes, and impacts across these sources.

        RULES:
        1. DO NOT invent or extrapolate facts not explicitly stated in the provided source texts.
        2. Keep exact numbers, percentages, currency figures, and dates intact.
        3. Include "source_index" matching the integer index [0..{len(batch)-1}] of the source where the fact came from.

        Output purely a JSON array of fact objects:
        [
            {{
                "source_index": 0,
                "fact_text": "Precise factual statement...",
                "evidence_quote": "Exact sentence or quote from text supporting this fact...",
                "fact_type": "statistic | metric | quote | background | impact | statement | event",
                "confidence": 0.95
            }}
        ]
        """

        parsed_facts, _ = call_llm_json(prompt, role="RESEARCH")
        if parsed_facts and isinstance(parsed_facts, list):
            for item in parsed_facts:
                if isinstance(item, dict) and item.get("fact_text"):
                    src_idx = item.get("source_index", 0)
                    if not isinstance(src_idx, int) or src_idx not in batch_map:
                        src_idx = 0
                    s = batch_map[src_idx]
                    extracted_facts.append({
                        "fact_text": item["fact_text"],
                        "evidence_quote": item.get("evidence_quote") or s.title,
                        "fact_type": item.get("fact_type", "statement"),
                        "confidence": item.get("confidence", 0.9),
                        "source_id": s.id,
                        "publisher": s.publisher,
                        "url": s.url,
                        "published_at": s.published_at.isoformat() if s.published_at else None,
                        "reliability": s.reliability
                    })

    if not extracted_facts and sources:
        print("[ResearchEngine Warning] No facts extracted via LLM. Generating fallback facts from source metadata...")
        for s in sources:
            desc = s.description[:200] if s.description else ""
            fact_text = f"{s.title}. {desc}".strip()
            if len(fact_text) > 15:
                extracted_facts.append({
                    "fact_text": fact_text,
                    "evidence_quote": s.title,
                    "fact_type": "event",
                    "confidence": 0.85,
                    "source_id": s.id,
                    "publisher": s.publisher,
                    "url": s.url,
                    "published_at": s.published_at.isoformat() if s.published_at else None,
                    "reliability": s.reliability
                })

    print(f"[ResearchEngine] Extracted {len(extracted_facts)} atomic facts with provenance from {len(sources)} sources.")
    return extracted_facts


def cross_verify_and_evaluate_quality(sources: list, facts: list, intent: dict) -> dict:
    """
    Evaluate cross-source agreement, coverage of research questions,
    and compute an overall Research Quality Score (0-100).
    """
    if not facts:
        return {
            "quality_score": 0,
            "fact_count": 0,
            "official_source_count": 0,
            "verified_facts": [],
            "contradictions": [],
            "requires_more_research": True
        }

    official_count = sum(1 for s in sources if s.reliability == 1)
    major_count = sum(1 for s in sources if s.reliability == 2)

    research_questions = [q for q in intent.get("research_questions", []) if isinstance(q, str) and q.strip()][:5]
    covered_questions = []

    if research_questions and facts:
        fact_texts = [f["fact_text"] for f in facts[:25] if f.get("fact_text")]
        if fact_texts:
            combined_embs = embed_texts(research_questions + fact_texts)
            q_embs = combined_embs[:len(research_questions)]
            f_embs = combined_embs[len(research_questions):]

            for qi, q_text in enumerate(research_questions):
                q_vec = q_embs[qi]
                max_sim = max((cosine_sim(q_vec, f_vec) for f_vec in f_embs), default=0.0)
                if max_sim >= 0.35:
                    covered_questions.append(q_text)

    question_coverage_ratio = len(covered_questions) / max(1, len(research_questions))

    fact_volume_score = min(40, len(facts) * 3)
    authority_score = min(30, (official_count * 15) + (major_count * 5))
    coverage_score = round(question_coverage_ratio * 30, 2)

    total_quality_score = min(100, int(fact_volume_score + authority_score + coverage_score))

    requires_more = total_quality_score < 50 or len(facts) < 4

    quality_metadata = {
        "quality_score": total_quality_score,
        "fact_count": len(facts),
        "official_source_count": official_count,
        "major_source_count": major_count,
        "covered_questions": covered_questions,
        "total_questions": len(research_questions),
        "requires_more_research": requires_more
    }

    print(f"[ResearchEngine] Research Quality Score: {total_quality_score}/100 (Facts: {len(facts)}, Official Sources: {official_count}, Coverage: {len(covered_questions)}/{len(research_questions)})")
    return quality_metadata


def run_additional_research_if_needed(db: Session, intent: dict, sources: list, quality_meta: dict) -> list[Source]:
    """
    If research quality score is low or key stats/official data are missing,
    run a targeted second-pass search for official/statistics sources.
    """
    if not quality_meta.get("requires_more_research", False):
        return sources

    print("[ResearchEngine] Quality score below threshold. Executing targeted secondary research pass...")

    topic = intent.get("topic_name", "")
    target_queries = [
        f"data statistik BPS {topic}",
        f"official report {topic}"
    ]

    secondary_intent = dict(intent)
    secondary_intent["search_queries_id"] = target_queries
    secondary_intent["search_queries_en"] = []

    additional_sources = discover_sources_multi_query(db, secondary_intent)

    combined = list(sources)
    existing_ids = {s.id for s in combined}
    for s in additional_sources:
        if s.id not in existing_ids:
            combined.append(s)
            existing_ids.add(s.id)

    return combined[:MAX_DISCOVERED_SOURCES + 2]
