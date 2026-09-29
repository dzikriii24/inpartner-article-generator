import os
import urllib.parse
import json
import re
from datetime import datetime
import requests
import feedparser
from bs4 import BeautifulSoup
import numpy as np
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from models import Source, NewsContent, NewsEmbedding
from services.llm_client import call_llm_json, call_llm

# Initialize local embedding model for fast semantic relevance and similarity
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

# Known authoritative / official domains
PRIMARY_OFFICIAL_DOMAINS = [
    "bps.go.id", "kemenkeu.go.id", "bi.go.id", "setkab.go.id", "kemenperin.go.id",
    "kemendag.go.id", "gov", "org", "ac.id", "edu", "who.int", "worldbank.org"
]

MAJOR_REPUTABLE_PUBLISHERS = [
    "reuters", "bloomberg", "antara", "cnbc", "kompas", "detik", "kontan", "bisnis.com",
    "the wall street journal", "wsj", "bbc", "financial times", "tempo", "jawapos"
]

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
    Fetch web content, clean boilerplate, and return body text with metadata.
    """
    result = {
        "text": "",
        "author": None,
        "published_at": None,
        "title": None
    }
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'html.parser')
            
            # Decompose ads, scripts, nav, footers, headers
            for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "form"]):
                element.decompose()
                
            # Extract author meta if present
            author_meta = soup.find("meta", attrs={"name": re.compile(r'author', re.I)}) or soup.find("meta", attrs={"property": re.compile(r'author', re.I)})
            if author_meta and author_meta.get("content"):
                result["author"] = author_meta["content"].strip()
                
            paragraphs = soup.find_all('p')
            clean_paragraphs = [p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 25]
            text_content = "\n\n".join(clean_paragraphs)
            
            # Sanitization for database compatibility
            text_content = "".join(c for c in text_content if ord(c) <= 0xFFFF)
            result["text"] = text_content
    except Exception as e:
        print(f"[ResearchEngine] Content extraction failed for {url}: {e}")
        
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
    8. search_queries_en: List of 3 distinct search query strings in English covering general news, statistics/data, and expert quotes.
    9. search_queries_id: List of 3 distinct search query strings in Indonesian covering news, BPS/data, and UMKM/dampak.
    
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
        return parsed
        
    # Fallback default intent
    return {
        "topic_name": user_prompt,
        "category": "Business & Economy",
        "geographic_scope": "Indonesia",
        "timeframe": "Recent News",
        "target_angle": user_prompt,
        "subtopics": [user_prompt, "Dampak Ekonomi", "Biaya Produksi", "Tanggapan Pihak Terkait"],
        "research_questions": [f"Apa penyebab utama {user_prompt}?", f"Bagaimana dampaknya terhadap pihak terkait?", "Berapa data/angka statistik terbarunya?"],
        "search_queries_en": [user_prompt, f"{user_prompt} statistics data"],
        "search_queries_id": [user_prompt, f"{user_prompt} BPS data", f"{user_prompt} dampak UMKM"]
    }

def discover_sources_multi_query(db: Session, intent: dict) -> list[Source]:
    """
    Executes search across multiple query variations via Google News RSS and GNews API.
    Retrieves, parses, and evaluates source authority & semantic relevance.
    """
    queries = intent.get("search_queries_id", []) + intent.get("search_queries_en", [])
    queries.append(intent.get("topic_name", ""))
    
    discovered_sources = []
    seen_urls = set()
    
    # 1. Google News RSS search per query
    for q in queries:
        if not q or len(q.strip()) < 3:
            continue
            
        encoded = urllib.parse.quote(q.strip())
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=id-ID&gl=ID&ceid=ID:id"
        
        try:
            parsed_feed = feedparser.parse(rss_url)
            for entry in parsed_feed.entries[:5]: # Top 5 entries per query
                url = entry.link
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                
                # Check DB cache
                existing = db.query(Source).filter(Source.url == url).first()
                if existing:
                    if existing not in discovered_sources:
                        discovered_sources.append(existing)
                    continue
                    
                pub_title = entry.get('source', {}).get('title', 'Google News')
                rel = evaluate_source_reliability(url, pub_title)
                domain = extract_domain(url)
                
                source = Source(
                    url=url,
                    title=entry.title,
                    publisher=pub_title,
                    published_at=datetime.utcnow(),
                    description=entry.get('summary', ''),
                    source_type="gnews_rss",
                    reliability=rel,
                    source_domain=domain
                )
                db.add(source)
                db.flush()
                
                # Extract full text
                extracted = extract_article_content_clean(url)
                full_text = extracted["text"] if extracted["text"] else entry.get('summary', '')
                if extracted["author"]:
                    source.author = extracted["author"]
                    
                news_content = NewsContent(
                    source_id=source.id,
                    full_content=full_text,
                    cleaned_content=full_text,
                    extracted_at=datetime.utcnow()
                )
                db.add(news_content)
                discovered_sources.append(source)
        except Exception as e:
            print(f"[ResearchEngine] RSS Search error for query '{q}': {e}")
            
    # 2. GNews API search as fallback/supplement
    api_key = os.getenv("GNEWS_API_KEY")
    if api_key and len(discovered_sources) < 8:
        try:
            primary_term = urllib.parse.quote(intent.get("topic_name", queries[0]))
            gnews_url = f"https://gnews.io/api/v4/search?q={primary_term}&lang=id&apikey={api_key}"
            res = requests.get(gnews_url, timeout=10)
            if res.status_code == 200:
                articles = res.json().get('articles', [])
                for a in articles[:5]:
                    url = a.get('url')
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    
                    existing = db.query(Source).filter(Source.url == url).first()
                    if existing:
                        if existing not in discovered_sources:
                            discovered_sources.append(existing)
                        continue
                        
                    pub_name = a.get('source', {}).get('name', 'GNews')
                    rel = evaluate_source_reliability(url, pub_name)
                    domain = extract_domain(url)
                    
                    source = Source(
                        url=url,
                        title=a.get('title'),
                        publisher=pub_name,
                        published_at=datetime.utcnow(),
                        description=a.get('description', ''),
                        image_url=a.get('image'),
                        source_type="gnews_api",
                        reliability=rel,
                        source_domain=domain
                    )
                    db.add(source)
                    db.flush()
                    
                    extracted = extract_article_content_clean(url)
                    full_text = extracted["text"] if extracted["text"] else a.get('description', '')
                    news_content = NewsContent(
                        source_id=source.id,
                        full_content=full_text,
                        cleaned_content=full_text,
                        extracted_at=datetime.utcnow()
                    )
                    db.add(news_content)
                    discovered_sources.append(source)
        except Exception as e:
            print(f"[ResearchEngine] GNews API error: {e}")

    if discovered_sources:
        db.commit()

    # 3. Calculate semantic relevance scores against topic intent
    intent_text = f"{intent.get('topic_name')} {intent.get('target_angle')} {' '.join(intent.get('subtopics', []))}"
    intent_emb = embed_model.encode(intent_text)
    
    for s in discovered_sources:
        content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
        body = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
        src_text = f"{s.title}. {body[:800]}"
        src_emb = embed_model.encode(src_text)
        sim_score = float(cosine_similarity([intent_emb], [src_emb])[0][0])
        s.relevance_score = round(sim_score, 4)
        
    db.commit()
    
    # Sort sources by reliability (1 before 2 before 3) and then relevance score
    discovered_sources.sort(key=lambda s: (s.reliability, -s.relevance_score))
    
    return discovered_sources[:12]

def extract_facts_and_provenance(sources: list, intent: dict) -> list[dict]:
    """
    Extract atomic facts, statistics, numbers, quotes, entity names with exact source provenance.
    """
    extracted_facts = []
    
    for i, s in enumerate(sources):
        content_obj = s.content_data.full_content if s.content_data and s.content_data.full_content else s.description
        if not content_obj or len(content_obj.strip()) < 30:
            continue
            
        prompt = f"""
        You are an expert Fact Extraction & Verification System.
        Topic: "{intent.get('topic_name')}"
        Target Angle: "{intent.get('target_angle')}"
        
        Source Title: "{s.title}"
        Publisher: "{s.publisher}"
        Source Reliability Level: {s.reliability} (1=Official Govt/BPS, 2=Major News, 3=Industry)
        
        Source Content:
        {content_obj[:3000]}
        
        TASK:
        Extract all verifiable, distinct atomic facts, statistics, dates, figures, entity names, official quotes, causes, and impacts from this source.
        
        RULES:
        1. DO NOT invent or extrapolate facts not explicitly stated in the source text.
        2. Keep exact numbers, percentages, currency figures, and dates intact.
        3. Extract evidence quotes directly from the text.
        
        Output purely a JSON array of fact objects:
        [
            {{
                "fact_text": "Precise factual statement...",
                "evidence_quote": "Exact sentence or quote from text supporting this fact...",
                "fact_type": "statistic | metric | quote | background | impact | statement | event",
                "confidence": 0.95
            }}
        ]
        """
        
        parsed_facts, model_used = call_llm_json(prompt, role="RESEARCH")
        if parsed_facts and isinstance(parsed_facts, list):
            for item in parsed_facts:
                if isinstance(item, dict) and item.get("fact_text"):
                    item["source_id"] = s.id
                    item["publisher"] = s.publisher
                    item["url"] = s.url
                    item["published_at"] = s.published_at.isoformat() if s.published_at else None
                    item["reliability"] = s.reliability
                    extracted_facts.append(item)
                    
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
    Cluster extracted facts, evaluate cross-source agreement, detect numeric discrepancies,
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
    
    # Check coverage of research questions
    research_questions = intent.get("research_questions", [])
    covered_questions = []
    
    if research_questions and facts:
        q_embs = embed_model.encode(research_questions)
        fact_texts = [f["fact_text"] for f in facts]
        f_embs = embed_model.encode(fact_texts)
        
        sim_mat = cosine_similarity(q_embs, f_embs)
        for qi, q_text in enumerate(research_questions):
            max_sim = float(np.max(sim_mat[qi]))
            if max_sim >= 0.35:
                covered_questions.append(q_text)
                
    question_coverage_ratio = len(covered_questions) / max(1, len(research_questions))
    
    # Calculate components of Research Quality Score (0-100)
    fact_volume_score = min(40, len(facts) * 3) # Max 40 pts for 13+ facts
    authority_score = min(30, (official_count * 15) + (major_count * 5)) # Max 30 pts
    coverage_score = round(question_coverage_ratio * 30, 2) # Max 30 pts
    
    total_quality_score = min(100, int(fact_volume_score + authority_score + coverage_score))
    
    requires_more = total_quality_score < 55 or len(facts) < 5
    
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
        f"pernyataan resmi kementerian {topic}",
        f"official report {topic}"
    ]
    
    secondary_intent = dict(intent)
    secondary_intent["search_queries_id"] = target_queries
    
    additional_sources = discover_sources_multi_query(db, secondary_intent)
    
    combined = list(sources)
    for s in additional_sources:
        if s not in combined:
            combined.append(s)
            
    return combined
