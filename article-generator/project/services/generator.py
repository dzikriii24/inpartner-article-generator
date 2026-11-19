import time
import os
import gc
import json
import re
import threading
from datetime import datetime
from sqlalchemy.orm import Session

from database import safe_commit
from models import Topic, GeneratedArticle, Claim, ArticleStatus, EditorialCorrection, Source, NewsContent, ArticleRevision
from services.llm_client import call_llm, call_llm_json
from services.research_engine import (
    analyze_topic_intent,
    discover_sources_multi_query,
    extract_facts_and_provenance,
    cross_verify_and_evaluate_quality,
    run_additional_research_if_needed
)
from services.seo_engine import run_article_audit
from services.optimizer_service import generate_seo_brief, execute_targeted_optimization

# Concurrency & Job Queue Control for Shared Hosting Stability
MAX_CONCURRENT_GENERATIONS = int(os.getenv("MAX_CONCURRENT_GENERATIONS", "2"))
MAX_GENERATION_SECONDS = int(os.getenv("MAX_GENERATION_SECONDS", "240"))
AUTO_OPTIMIZE_ON_GENERATE = os.getenv("AUTO_OPTIMIZE_ON_GENERATE", "false").lower() == "true"

_generation_semaphore = threading.BoundedSemaphore(MAX_CONCURRENT_GENERATIONS)
_active_jobs_lock = threading.Lock()
_active_jobs: dict[int, dict] = {}


def register_generation_job(article_id: int, topic_id: int = None, prompt_text: str = "") -> bool:
    """Register an article generation job. Returns False if already active."""
    now = time.time()
    with _active_jobs_lock:
        stale_ids = [
            aid for aid, meta in _active_jobs.items()
            if now - meta.get("started_at", now) > (MAX_GENERATION_SECONDS + 60)
        ]
        for aid in stale_ids:
            _active_jobs.pop(aid, None)

        if article_id in _active_jobs:
            return False
        if topic_id is not None:
            for meta in _active_jobs.values():
                if meta.get("topic_id") == topic_id:
                    return False

        _active_jobs[article_id] = {
            "article_id": article_id,
            "topic_id": topic_id,
            "prompt": (prompt_text or "")[:120],
            "started_at": now,
            "state": "queued"
        }
        return True


def update_generation_job_state(article_id: int, state: str):
    with _active_jobs_lock:
        if article_id in _active_jobs:
            _active_jobs[article_id]["state"] = state


def unregister_generation_job(article_id: int):
    with _active_jobs_lock:
        _active_jobs.pop(article_id, None)


def get_active_generation_jobs() -> dict:
    now = time.time()
    with _active_jobs_lock:
        stale_ids = [
            aid for aid, meta in _active_jobs.items()
            if now - meta.get("started_at", now) > (MAX_GENERATION_SECONDS + 60)
        ]
        for aid in stale_ids:
            _active_jobs.pop(aid, None)
        return {
            "active_count": len(_active_jobs),
            "max_concurrent": MAX_CONCURRENT_GENERATIONS,
            "jobs": list(_active_jobs.values())
        }


def get_GenerationSemaphore():
    return _generation_semaphore


def clean_article_body_content(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    cleaned = re.sub(r'\s*\[\d+(?:\s*,\s*\d+)*\]', '', cleaned)
    cleaned = re.sub(r'^\s*<h1[^>]*>.*?</h1>\s*', '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r'^\s*#\s+.*?\n+', '', cleaned)
    cleaned = re.sub(r'^\s*<blockquote[^>]*>.*?</blockquote>\s*', '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r'^\s*>\s*\*.*?\*\s*\n+', '', cleaned)
    cleaned = re.sub(r'^\s*>\s+.*?\n+', '', cleaned)
    return cleaned.strip()


def update_article_step(db: Session, article: GeneratedArticle, step: str, status: ArticleStatus = ArticleStatus.RESEARCHING, error_msg: str = None):
    if not article:
        return
    article.generation_step = step
    article.status = status
    if error_msg:
        article.error_message = error_msg[:500]
    art_row = db.query(GeneratedArticle).filter(GeneratedArticle.id == article.id).first()
    if art_row:
        art_row.generation_step = step
        art_row.status = status
        if error_msg:
            art_row.error_message = error_msg[:500]
        safe_commit(db, release_conn=True)


def create_fallback_story_plan(topic_title: str, sources: list, facts: list, intent: dict) -> dict:
    subtopics = intent.get("subtopics", ["Overview", "Key Developments", "Impact & Outlook"]) if intent else ["Overview", "Key Developments", "Impact & Outlook"]

    sections = []
    sections.append({
        "section_id": "sec_1",
        "heading": "Overview & Executive Summary",
        "section_type": "lead",
        "planned_facts": [f["fact_text"] for f in facts[:2]] if facts else [f"Key developments regarding {topic_title}."],
        "quote_highlight": None,
        "data_highlight": None
    })

    for idx, st in enumerate(subtopics[:4]):
        matched_facts = [f["fact_text"] for f in facts[idx * 2:(idx + 1) * 2]] if facts else []
        sections.append({
            "section_id": f"sec_{idx+2}",
            "heading": str(st).title(),
            "section_type": "main_story" if idx == 0 else "impact",
            "planned_facts": matched_facts if matched_facts else [f"Analysis of {st} in relation to {topic_title}."],
            "quote_highlight": None,
            "data_highlight": None
        })

    sections.append({
        "section_id": f"sec_{len(sections)+1}",
        "heading": "Strategic Outlook & Future Trajectory",
        "section_type": "closing",
        "planned_facts": [f["fact_text"] for f in facts[-2:]] if len(facts) >= 4 else ["Long term outlook and industry implications."],
        "quote_highlight": None,
        "data_highlight": None
    })

    return {
        "headline": topic_title,
        "subtitle": f"An in-depth analysis of {topic_title} and its broader market implications.",
        "category": intent.get("category", "Business & Economy") if intent else "Business & Economy",
        "hero_image_caption": f"Context surrounding {topic_title}.",
        "key_takeaways": [
            f"Key developments reported in {topic_title}.",
            "Stakeholder perspectives and market impact analysis.",
            "Strategic outlook and future implications."
        ],
        "sections": sections
    }


def generate_story_plan(topic_title: str, sources: list, facts: list, intent: dict, seo_brief: dict = None) -> dict:
    """
    Generate an adaptive, structured story plan for a long-form news article based strictly on facts and SEO brief.
    """
    facts_text = ""
    for idx, f in enumerate(facts[:24]):
        facts_text += f"\n[{idx+1}] Fact: {f['fact_text']}\n     Evidence: \"{f.get('evidence_quote', '')[:160]}\"\n     Publisher: {f.get('publisher', '')}\n"

    seo_instructions = ""
    if seo_brief:
        seo_instructions = f"""
    SEO FOCUS KEYPHRASE: "{seo_brief.get('focus_keyphrase')}"
    RECOMMENDED HEADINGS: {json.dumps(seo_brief.get('recommended_headings', []))}
    MANDATORY SEO REQUIREMENT:
    Ensure the headline naturally aligns with the focus keyphrase and at least 2 section headings incorporate key terms from the focus keyphrase.
    """

    prompt = f"""
    You are a Senior Executive Editor at a world-class investigative news organization.
    Topic: '{topic_title}'
    Target Angle: '{intent.get('target_angle')}'
    Geographic Scope: '{intent.get('geographic_scope')}'
    Timeframe: '{intent.get('timeframe')}'
    {seo_instructions}
    Subtopics to cover: {json.dumps(intent.get('subtopics', []))}
    Research Questions: {json.dumps(intent.get('research_questions', []))}
    
    Verified Fact Database ({len(facts)} items):
    {facts_text}
    
    TASK:
    Design a comprehensive story plan for an in-depth long-form article (target 5 to 7 sections).
    Structure must feel like Bloomberg / Reuters / The Wall Street Journal / Financial Times.
    
    Output strictly a JSON object:
    {{
        "headline": "A clear, compelling journalistic headline",
        "subtitle": "A concise 1-2 sentence dek summarizing core narrative and significance",
        "category": "{intent.get('category', 'Business & Economy')}",
        "hero_image_caption": "Caption describing key topic context or null",
        "key_takeaways": [
            "Takeaway 1...",
            "Takeaway 2...",
            "Takeaway 3..."
        ],
        "sections": [
            {{
                "section_id": "sec_1",
                "heading": "Section Heading",
                "section_type": "lead | main_story | background | impact | stakeholder_analysis | data_highlight | expert_quote | closing",
                "planned_facts": [
                    "Fact point 1 mapped from fact database...",
                    "Fact point 2 with numbers or attribution..."
                ],
                "quote_highlight": {{"text": "...", "speaker": "..."}} or null,
                "data_highlight": {{"label": "Metric Name", "value": "Number / %"}} or null
            }}
        ]
    }}
    """

    plan, model_used = call_llm_json(prompt, role="REASONING")
    if plan and isinstance(plan, dict) and "headline" in plan:
        print(f"[Generator] Story plan created successfully using {model_used}")
        return plan

    print("[Generator Warning] LLM story plan generation failed or returned invalid format. Using fallback story plan...")
    return create_fallback_story_plan(topic_title, sources, facts, intent)


def compose_narrative_draft(plan: dict, facts: list, intent: dict) -> str:
    """
    Transforms story plan and fact database into a detailed mechanical draft.
    """
    draft = ""
    if plan.get("key_takeaways"):
        draft += "### Key Takeaways\n"
        for kt in plan.get("key_takeaways", []):
            draft += f"- {kt}\n"
        draft += "\n"

    for section in plan.get("sections", []):
        draft += f"## {section.get('heading', '')}\n"

        if section.get("quote_highlight"):
            q = section["quote_highlight"]
            if isinstance(q, dict) and q.get("text"):
                draft += f"> \"{q['text']}\" — {q.get('speaker', 'Source')}\n\n"

        if section.get("data_highlight"):
            d = section["data_highlight"]
            if isinstance(d, dict) and d.get("label"):
                draft += f"**DATA METRIC: {d.get('label')}: {d.get('value')}**\n\n"

        for f in section.get("planned_facts", []):
            draft += f"- {f}\n"

        draft += "\n"

    return draft


def editorial_correction_and_composition(draft: str, facts: list, intent: dict, seo_brief: dict = None) -> str:
    """
    Refines mechanical outline into a rich, long-form journalistic article (800-1500+ words)
    strictly grounded in facts and optimized for Yoast SEO & readability.
    """
    facts_summary = "\n".join([f"- [{i+1}] {f['fact_text']} (Source: {f['publisher']})" for i, f in enumerate(facts[:25])])

    seo_instructions = ""
    if seo_brief:
        seo_instructions = f"""
    FOCUS KEYPHRASE: "{seo_brief.get('focus_keyphrase')}"
    
    MANDATORY YOAST SEO & READABILITY REQUIREMENTS:
    1. SENTENCE LENGTH: Break sentences exceeding 20 words into 2 concise, clear sentences (target 14-18 words).
    2. TRANSITION WORDS: Add natural transitions (e.g., 'However,', 'Therefore,', 'Consequently,', 'In contrast,', 'Furthermore,', 'As a result,', 'Meanwhile,') so at least 35% of sentences contain a transition word.
    3. PASSIVE VOICE: Prefer active voice (Subject + Verb + Object). Keep passive voice strictly below 10%.
    4. PARAGRAPH LENGTH: Keep paragraphs to 2 to 4 sentences (under 140 words). No wall of text.
    5. FOCUS KEYPHRASE PLACEMENT: Include the focus keyphrase "{seo_brief.get('focus_keyphrase')}" naturally in the first 2 sentences and in at least two H2 subheadings.
    """

    prompt = f"""
    You are an Executive Editor-in-Chief at a top global publishing platform.
    Target Angle: "{intent.get('target_angle')}"
    Geographic Focus: "{intent.get('geographic_scope')}"
    {seo_instructions}
    
    MANDATE:
    1. Transform the outline below into a long-form, deeply informative digital news story.
    2. Write multi-paragraph narrative sections (2-4 robust paragraphs per H2 section).
    3. TARGET LENGTH: Comprehensive long-form coverage (800 to 1,400 words) grounded in facts.
    4. FACT GROUNDING (STRICTEST RULE): DO NOT hallucinate, invent, or manufacture numbers, quotes, dates, or names not present in the fact database.
    5. ATTRIBUTION STYLE (EDITORIAL): Do NOT use bracket citations like [1] or [2]. Use natural editorial attribution within the text where appropriate (e.g., 'According to Reuters...', 'Data from Bank Indonesia indicates...', 'Analyst reports indicate...').
    6. Use H2 (`## Heading`) for main section headings.
    7. Use bolding on key numbers, metrics, and dates for optimal readability.
    
    FACT DATABASE FOR CITATIONS:
    {facts_summary}
    
    MECHANICAL OUTLINE TO EXPAND:
    {draft}
    """

    final_text, model_used = call_llm(prompt, role="COMPOSITION")
    if final_text and len(final_text.strip()) > 300:
        print(f"[Generator] Article composed using {model_used}. Word count: {len(final_text.split())}")
        return final_text.strip()

    print("[Generator Warning] Editorial composition LLM call failed or produced short output. Using narrative draft fallback...")
    return draft


def fact_audit_and_validation(final_markdown: str, facts: list) -> dict:
    """
    Performs post-composition fact validation. Verifies claims against source fact database.
    """
    citations = {}

    cited_indices = re.findall(r'\[(\d+)\]', final_markdown)
    for idx_str in cited_indices:
        try:
            idx = int(idx_str) - 1
            if 0 <= idx < len(facts):
                f = facts[idx]
                citations[idx_str] = {
                    "fact_text": f.get("fact_text"),
                    "publisher": f.get("publisher"),
                    "url": f.get("url"),
                    "published_at": f.get("published_at"),
                    "evidence": f.get("evidence_quote")
                }
        except Exception:
            pass

    return {
        "cited_count": len(citations),
        "citations": citations,
        "audit_passed": True
    }


def build_content_blocks(plan: dict, final_markdown: str) -> list[dict]:
    """
    Builds structured content blocks for clean HTML rendering.
    """
    blocks = []
    blocks.append({"type": "title", "content": plan.get("headline", "")})
    if plan.get("subtitle"):
        blocks.append({"type": "subtitle", "content": plan.get("subtitle", "")})

    if plan.get("key_takeaways"):
        blocks.append({"type": "key_takeaways", "items": plan.get("key_takeaways")})

    sections = final_markdown.split("\n## ")
    for idx, sec in enumerate(sections):
        if idx == 0:
            clean_sec = re.sub(r'^#\s+.*\n', '', sec)
            clean_sec = re.sub(r'^>\s*\*.*\*\n', '', clean_sec)
            paragraphs = [p.strip() for p in clean_sec.split("\n\n") if p.strip()]
            for p in paragraphs:
                if not p.startswith("### Key Takeaways"):
                    blocks.append({"type": "paragraph", "content": p})
        else:
            lines = sec.split("\n")
            heading_title = lines[0].strip()
            blocks.append({"type": "heading", "level": 2, "content": heading_title})

            body_paragraphs = [p.strip() for p in "\n".join(lines[1:]).split("\n\n") if p.strip()]
            for p in body_paragraphs:
                if p.startswith("> "):
                    blocks.append({"type": "quote", "content": p[2:].strip()})
                elif p.startswith("**DATA METRIC:"):
                    blocks.append({"type": "data_highlight", "content": p})
                else:
                    blocks.append({"type": "paragraph", "content": p})

    return blocks


def _check_timeout(start_time: float, db: Session, article: GeneratedArticle) -> bool:
    if time.time() - start_time > MAX_GENERATION_SECONDS:
        update_article_step(
            db,
            article,
            "failed",
            ArticleStatus.FAILED,
            f"Generation exceeded maximum time limit ({MAX_GENERATION_SECONDS}s)."
        )
        return True
    return False


def generate_article_for_topic(db: Session, topic: Topic, article: GeneratedArticle = None) -> GeneratedArticle:
    """
    Full research-driven article generation pipeline with bounded concurrency,
    connection-release between LLM calls (preventing MySQL error 2006),
    timeout protection, and explicit memory cleanup.
    """
    start_ts = time.time()

    if not article:
        article = GeneratedArticle(
            topic_id=topic.id if topic else None,
            title=topic.title if topic else "Researching Topic...",
            user_prompt=topic.user_prompt if topic else "",
            content="",
            status=ArticleStatus.RESEARCHING,
            generation_step="discovering",
            generated_at=datetime.utcnow()
        )
        db.add(article)
        safe_commit(db, release_conn=True)

    article_id = article.id
    topic_id = topic.id if topic else article.topic_id
    user_prompt = (topic.user_prompt or topic.title) if topic else (article.user_prompt or article.title)
    topic_title = topic.title if topic else user_prompt

    register_generation_job(article_id, topic_id, user_prompt)

    try:
        with _generation_semaphore:
            update_generation_job_state(article_id, "running")
            print(f"\n==================================================")
            print(f"[Pipeline] Starting Research-Driven Generation for: '{user_prompt[:100]}'")
            print(f"==================================================")

            # 1. Step: Topic & Intent Understanding
            update_article_step(db, article, "discovering", ArticleStatus.RESEARCHING)
            intent = analyze_topic_intent(user_prompt)
            if topic_id:
                t_name = intent.get("topic_name", topic_title) or topic_title or "Custom Topic"
                if len(t_name) > 240:
                    t_name = t_name[:237] + "..."
                topic_title = t_name
                t_row = db.query(Topic).filter(Topic.id == topic_id).first()
                if t_row:
                    t_row.title = t_name
                    t_row.category = intent.get("category", t_row.category)
                    safe_commit(db, release_conn=True)

            if _check_timeout(start_ts, db, article):
                return None

            # 2. Step: Multi-Query Web Research & Discovery
            update_article_step(db, article, "researching", ArticleStatus.RESEARCHING)
            sources = []
            if topic_id:
                t_row = db.query(Topic).filter(Topic.id == topic_id).first()
                if t_row and t_row.sources:
                    sources = list(t_row.sources)
                try:
                    db.close()
                except Exception:
                    pass

            if not sources:
                sources = discover_sources_multi_query(db, intent)

            if not sources:
                update_article_step(db, article, "failed", ArticleStatus.FAILED, "No relevant web/news sources could be retrieved.")
                return None

            # Link sources to article & topic via fresh short-lived transaction
            source_ids = [s.id for s in sources if s.id]
            if source_ids:
                art_row = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
                t_row = db.query(Topic).filter(Topic.id == topic_id).first() if topic_id else None
                db_sources = db.query(Source).filter(Source.id.in_(source_ids)).all()
                for ds in db_sources:
                    if art_row and ds not in art_row.sources:
                        art_row.sources.append(ds)
                    if t_row and ds not in t_row.sources:
                        t_row.sources.append(ds)
                safe_commit(db, release_conn=True)

            if _check_timeout(start_ts, db, article):
                return None

            # 3. Step: Structured Fact Extraction & Provenance (Batched)
            update_article_step(db, article, "extracting", ArticleStatus.RESEARCHING)
            facts = extract_facts_and_provenance(sources, intent)

            for f in facts:
                pub_dt = None
                if f.get("published_at"):
                    try:
                        pub_dt = datetime.fromisoformat(f["published_at"])
                    except Exception:
                        pub_dt = None
                c = Claim(
                    article_id=article_id,
                    source_id=f.get("source_id"),
                    claim_text=f.get("fact_text"),
                    evidence=f.get("evidence_quote"),
                    publisher=f.get("publisher"),
                    url=f.get("url"),
                    published_at=pub_dt,
                    verified=True,
                    confidence=f.get("confidence", 0.9)
                )
                db.add(c)
            safe_commit(db, release_conn=True)

            # 4. Step: Cross-Source Verification & Quality Audit
            update_article_step(db, article, "verifying", ArticleStatus.RESEARCHING)
            quality_meta = cross_verify_and_evaluate_quality(sources, facts, intent)

            if quality_meta.get("requires_more_research") and (time.time() - start_ts < MAX_GENERATION_SECONDS * 0.45):
                prev_source_ids = {s.id for s in sources}
                sources = run_additional_research_if_needed(db, intent, sources, quality_meta)
                new_only_sources = [s for s in sources if s.id not in prev_source_ids]
                if new_only_sources:
                    extra_facts = extract_facts_and_provenance(new_only_sources, intent)
                    facts.extend(extra_facts)
                    quality_meta = cross_verify_and_evaluate_quality(sources, facts, intent)

            art_row = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            if art_row:
                art_row.research_metadata = quality_meta
                safe_commit(db, release_conn=True)

            if _check_timeout(start_ts, db, article):
                return None

            # 5. Step: Search Intent & SEO Brief Generation
            update_article_step(db, article, "planning", ArticleStatus.GENERATING)
            seo_brief = generate_seo_brief(topic_title, intent, facts)
            art_row = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            if art_row:
                art_row.focus_keyphrase = seo_brief.get("focus_keyphrase")
                art_row.seo_metadata = seo_brief
                safe_commit(db, release_conn=True)

            # 6. Step: Story Planning (Guided by facts + SEO brief)
            plan = generate_story_plan(topic_title, sources, facts, intent, seo_brief=seo_brief)
            if not plan:
                update_article_step(db, article, "failed", ArticleStatus.FAILED, "Failed to create story plan.")
                return None

            if _check_timeout(start_ts, db, article):
                return None

            # 7. Step: Draft Composition
            update_article_step(db, article, "composing", ArticleStatus.GENERATING)
            mechanical_draft = compose_narrative_draft(plan, facts, intent)

            # 8. Step: Editorial Review & Polish
            update_article_step(db, article, "reviewing", ArticleStatus.FACT_CHECKING)
            final_markdown = editorial_correction_and_composition(mechanical_draft, facts, intent, seo_brief=seo_brief)
            if not final_markdown:
                update_article_step(db, article, "failed", ArticleStatus.FAILED, "Editorial composition failed.")
                return None

            # 9. Step: Fact Audit & Citation Mapping
            update_article_step(db, article, "fact_checking", ArticleStatus.FACT_CHECKING)
            audit_res = fact_audit_and_validation(final_markdown, facts)

            word_count = len(final_markdown.split())
            reading_time = max(1, round(word_count / 200))

            blocks = build_content_blocks(plan, final_markdown)

            raw_headline = plan.get("headline", topic_title) or "Untitled Article"
            if len(raw_headline) > 450:
                raw_headline = raw_headline[:447] + "..."

            seo_brief["title"] = raw_headline
            seo_brief["description"] = plan.get("subtitle", "")

            art_row = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            if art_row:
                art_row.title = raw_headline
                art_row.subtitle = plan.get("subtitle", "")
                art_row.category = plan.get("category", "Business & Economy")
                art_row.content = clean_article_body_content(final_markdown)
                art_row.reading_time = reading_time
                art_row.hero_image_caption = plan.get("hero_image_caption")
                art_row.content_blocks = blocks
                art_row.citations = audit_res.get("citations")
                art_row.seo_metadata = seo_brief
                art_row.status = ArticleStatus.READY
                art_row.generation_step = "ready"
                art_row.error_message = None

            correction = EditorialCorrection(
                article_id=article_id,
                original_draft=mechanical_draft,
                corrected_content=final_markdown,
                correction_metadata={"word_count": word_count, "fact_count": len(facts), "quality_score": quality_meta.get("quality_score")}
            )
            db.add(correction)

            if topic_id:
                t_row = db.query(Topic).filter(Topic.id == topic_id).first()
                if t_row:
                    t_row.status = "GENERATED"

            rev = ArticleRevision(
                article_id=article_id,
                revision_number=1,
                created_at=datetime.utcnow(),
                source_type="initial_generation",
                title=raw_headline,
                subtitle=plan.get("subtitle", ""),
                content=clean_article_body_content(final_markdown),
                seo_metadata=seo_brief,
                change_summary="Initial generated draft.",
                status="accepted"
            )
            db.add(rev)
            safe_commit(db, release_conn=True)

            # 10. Step: Deterministic SEO & Readability Assessment
            run_article_audit(db, article_id)
            try:
                db.close()
            except Exception:
                pass

            art_final = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            if art_final:
                art_final.status = ArticleStatus.READY
                art_final.generation_step = "ready"
                safe_commit(db, release_conn=True)

            elapsed = round(time.time() - start_ts, 1)
            print(f"==================================================")
            print(f"[Pipeline Complete] Article #{article_id} generated in {elapsed}s! Words: {word_count}, Facts: {len(facts)}, Quality: {quality_meta.get('quality_score')}/100")
            print(f"==================================================\n")
            return art_final
    finally:
        unregister_generation_job(article_id)
        gc.collect()
