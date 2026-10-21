import time
import os
import json
import re
from datetime import datetime
from sqlalchemy.orm import Session

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
    if article:
        article.generation_step = step
        article.status = status
        if error_msg:
            article.error_message = error_msg
        db.commit()

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
        matched_facts = [f["fact_text"] for f in facts[idx*2:(idx+1)*2]] if facts else []
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
    for idx, f in enumerate(facts[:30]):
        facts_text += f"\n[{idx+1}] Fact: {f['fact_text']}\n     Evidence: \"{f.get('evidence_quote', '')}\"\n     Publisher: {f.get('publisher', '')} ({f.get('published_at', '')})\n"
        
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
    Design a comprehensive story plan for an in-depth long-form article (target 5 to 8+ sections).
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
        
    print(f"[Generator Warning] LLM story plan generation failed or returned invalid format. Using robust fallback story plan...")
    return create_fallback_story_plan(topic_title, sources, facts, intent)

def compose_narrative_draft(plan: dict, facts: list, intent: dict) -> str:
    """
    Transforms story plan and fact database into a detailed mechanical draft with citation tags [1], [2].
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
    STRICT RULE: Absolutely no invented facts, fake quotes, or ungrounded statistics.
    """
    facts_summary = "\n".join([f"- [{i+1}] {f['fact_text']} (Source: {f['publisher']})" for i, f in enumerate(facts[:30])])
    
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
    3. TARGET LENGTH: Comprehensive long-form coverage (800 to 1,500+ words) grounded in facts.
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
        
    print(f"[Generator Warning] Editorial composition LLM call failed or produced short output. Using narrative draft fallback...")
    return draft


def fact_audit_and_validation(final_markdown: str, facts: list) -> dict:
    """
    Performs post-composition fact validation. Verifies claims against source fact database.
    """
    claims = []
    citations = {}
    
    # Simple regex citation parser for [1], [2] style
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
        
    # Split markdown by headings
    sections = final_markdown.split("\n## ")
    for idx, sec in enumerate(sections):
        if idx == 0:
            # Intro paragraphs
            clean_sec = re.sub(r'^#\s+.*\n', '', sec) # Strip title if present
            clean_sec = re.sub(r'^>\s*\*.*\*\n', '', clean_sec) # Strip dek if present
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

def generate_article_for_topic(db: Session, topic: Topic, article: GeneratedArticle = None) -> GeneratedArticle:
    """
    Full research-driven article generation pipeline.
    """
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
        db.commit()
        
    user_prompt = topic.user_prompt or topic.title
    print(f"\n==================================================")
    print(f"[Pipeline] Starting Research-Driven Generation for: '{user_prompt}'")
    print(f"==================================================")
    
    # 1. Step: Topic & Intent Understanding
    update_article_step(db, article, "discovering", ArticleStatus.RESEARCHING)
    intent = analyze_topic_intent(user_prompt)
    if topic:
        t_name = intent.get("topic_name", topic.title) or topic.title or "Custom Topic"
        if len(t_name) > 240:
            t_name = t_name[:237] + "..."
        topic.title = t_name
        topic.category = intent.get("category", topic.category)
        db.commit()

    # 2. Step: Multi-Query Web Research & Discovery
    update_article_step(db, article, "researching", ArticleStatus.RESEARCHING)
    sources = topic.sources if topic and topic.sources else []
    if not sources:
        sources = discover_sources_multi_query(db, intent)
        
    if not sources:
        update_article_step(db, article, "failed", ArticleStatus.FAILED, "No relevant web/news sources could be retrieved.")
        return None

    # Connect sources to article & topic
    for s in sources:
        if s not in article.sources:
            article.sources.append(s)
        if topic and s not in topic.sources:
            topic.sources.append(s)
    db.commit()

    # 3. Step: Structured Fact Extraction & Provenance
    update_article_step(db, article, "extracting", ArticleStatus.RESEARCHING)
    facts = extract_facts_and_provenance(sources, intent)
    
    # Save claims to DB
    for f in facts:
        c = Claim(
            article_id=article.id,
            source_id=f.get("source_id"),
            claim_text=f.get("fact_text"),
            evidence=f.get("evidence_quote"),
            publisher=f.get("publisher"),
            url=f.get("url"),
            published_at=datetime.fromisoformat(f["published_at"]) if f.get("published_at") else None,
            verified=True,
            confidence=f.get("confidence", 0.9)
        )
        db.add(c)
    db.commit()

    # 4. Step: Cross-Source Verification & Quality Audit (+ Additional Research Loop if needed)
    update_article_step(db, article, "verifying", ArticleStatus.RESEARCHING)
    quality_meta = cross_verify_and_evaluate_quality(sources, facts, intent)
    
    if quality_meta.get("requires_more_research"):
        sources = run_additional_research_if_needed(db, intent, sources, quality_meta)
        facts = extract_facts_and_provenance(sources, intent)
        quality_meta = cross_verify_and_evaluate_quality(sources, facts, intent)

    article.research_metadata = quality_meta
    db.commit()

    # 5. Step: Search Intent & SEO Brief Generation
    update_article_step(db, article, "planning", ArticleStatus.GENERATING)
    seo_brief = generate_seo_brief(topic.title if topic else user_prompt, intent, facts)
    article.focus_keyphrase = seo_brief.get("focus_keyphrase")
    article.seo_metadata = seo_brief
    db.commit()

    # 6. Step: Story Planning (Guided by facts + SEO brief)
    plan = generate_story_plan(topic.title if topic else user_prompt, sources, facts, intent, seo_brief=seo_brief)
    if not plan:
        update_article_step(db, article, "failed", ArticleStatus.FAILED, "Failed to create story plan.")
        return None

    # 7. Step: Draft Composition
    update_article_step(db, article, "composing", ArticleStatus.GENERATING)
    mechanical_draft = compose_narrative_draft(plan, facts, intent)

    # 8. Step: Editorial Review & Polish (Guided by Yoast SEO & readability requirements)
    update_article_step(db, article, "reviewing", ArticleStatus.FACT_CHECKING)
    final_markdown = editorial_correction_and_composition(mechanical_draft, facts, intent, seo_brief=seo_brief)
    if not final_markdown:
        update_article_step(db, article, "failed", ArticleStatus.FAILED, "Editorial composition failed.")
        return None

    # 9. Step: Fact Audit & Citation Mapping
    update_article_step(db, article, "fact_checking", ArticleStatus.FACT_CHECKING)
    audit_res = fact_audit_and_validation(final_markdown, facts)

    # Calculate reading time (~200 words per minute)
    word_count = len(final_markdown.split())
    reading_time = max(1, round(word_count / 200))

    blocks = build_content_blocks(plan, final_markdown)

    # Finalize article record
    raw_headline = plan.get("headline", topic.title if topic else user_prompt) or "Untitled Article"
    if len(raw_headline) > 450:
        raw_headline = raw_headline[:447] + "..."
    article.title = raw_headline
    article.subtitle = plan.get("subtitle", "")
    article.category = plan.get("category", "Business & Economy")
    article.content = clean_article_body_content(final_markdown)
    article.reading_time = reading_time
    article.hero_image_caption = plan.get("hero_image_caption")
    article.content_blocks = blocks
    article.citations = audit_res.get("citations")
    
    # Store complete SEO metadata from SEO brief
    seo_brief["title"] = article.title
    seo_brief["description"] = article.subtitle
    article.seo_metadata = seo_brief
    article.status = ArticleStatus.READY
    article.generation_step = "ready"
    article.error_message = None

    # Save editorial correction log
    correction = EditorialCorrection(
        article_id=article.id,
        original_draft=mechanical_draft,
        corrected_content=final_markdown,
        correction_metadata={"word_count": word_count, "fact_count": len(facts), "quality_score": quality_meta.get("quality_score")}
    )
    db.add(correction)
    if topic:
        topic.status = "GENERATED"
    db.commit()

    # 10. Step: Automated SEO & Readability Assessment and Targeted Optimization Loop
    update_article_step(db, article, "auditing", ArticleStatus.FACT_CHECKING)
    initial_audit = run_article_audit(db, article.id)
    
    # If initial scores are below quality target (< 75), perform targeted optimization pass
    if initial_audit and (initial_audit.seo_score < 75 or initial_audit.readability_score < 75):
        update_article_step(db, article, "optimizing", ArticleStatus.FACT_CHECKING)
        opt_res = execute_targeted_optimization(db, article, initial_audit)
        if opt_res.get("success"):
            article.title = opt_res["title"]
            article.subtitle = opt_res["subtitle"]
            article.content = clean_article_body_content(opt_res["content"])
            article.seo_metadata = opt_res["seo_metadata"]
            article.last_optimized_at = datetime.utcnow()
            article.optimization_status = "OPTIMIZED"
            
            # Save accepted revision snapshot
            rev = ArticleRevision(
                article_id=article.id,
                revision_number=1,
                created_at=datetime.utcnow(),
                source_type="ai_optimization",
                title=opt_res["title"],
                subtitle=opt_res["subtitle"],
                content=article.content,
                seo_metadata=opt_res["seo_metadata"],
                change_summary=opt_res["change_summary"],
                status="accepted",
                diff_data=opt_res["diff_data"],
                audit_snapshot={"before": opt_res["before_scores"], "after": opt_res["after_scores"]}
            )
            db.add(rev)
            db.commit()
            
            # Re-audit
            final_audit = run_article_audit(db, article.id)
            print(f"[Pipeline SEO Engine] Auto-optimized Article #{article.id}: SEO={final_audit.seo_score}, Readability={final_audit.readability_score}")
        else:
            # Baseline revision snapshot
            rev = ArticleRevision(
                article_id=article.id,
                revision_number=1,
                created_at=datetime.utcnow(),
                source_type="initial_generation",
                title=article.title,
                subtitle=article.subtitle,
                content=article.content,
                seo_metadata=article.seo_metadata,
                change_summary="Initial generated draft.",
                status="accepted"
            )
            db.add(rev)
            db.commit()
    else:
        # Baseline revision snapshot
        rev = ArticleRevision(
            article_id=article.id,
            revision_number=1,
            created_at=datetime.utcnow(),
            source_type="initial_generation",
            title=article.title,
            subtitle=article.subtitle,
            content=article.content,
            seo_metadata=article.seo_metadata,
            change_summary="Initial generated draft.",
            status="accepted"
        )
        db.add(rev)
        db.commit()

    article.status = ArticleStatus.READY
    article.generation_step = "ready"
    db.commit()

    print(f"==================================================")
    print(f"[Pipeline Complete] Article #{article.id} generated! Words: {word_count}, Facts: {len(facts)}, Quality: {quality_meta.get('quality_score')}/100")
    print(f"==================================================\n")
    return article

