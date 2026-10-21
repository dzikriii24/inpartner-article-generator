import json
import re
import difflib
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from models import GeneratedArticle, ArticleRevision, ArticleAudit, Claim
from services.llm_client import call_llm, call_llm_json
from services.seo_engine import (
    analyze_readability,
    analyze_seo,
    run_article_audit,
    strip_html_markdown,
    derive_focus_keyphrase
)


def generate_seo_brief(
    topic_title: str,
    intent: Optional[Dict[str, Any]] = None,
    facts: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates a structured SEO content brief before or during article drafting.
    Includes focus keyphrase, SEO title, meta description, slug, heading suggestions,
    and search intent parameters.
    """
    intent = intent or {}
    subtopics = intent.get("subtopics", [])
    target_angle = intent.get("target_angle", "Executive analysis and strategic implications")
    category = intent.get("category", "Business & Economy")
    
    prompt = f"""
    You are an expert SEO Strategist and Business Content Director at a premier financial publication.
    Topic: "{topic_title}"
    Target Angle: "{target_angle}"
    Category: "{category}"
    Subtopics: {json.dumps(subtopics[:5])}
    
    TASK:
    Create a highly professional, Yoast-compatible SEO Content Brief for an in-depth English business article.
    Optimize for executives, investors, and business leaders.
    
    STRICT CONSTRAINTS:
    1. "focus_keyphrase": A concise, natural 2-4 word focus keyphrase (e.g. "Global Supply Chain Disruptions" or "Indonesia Nickel Export Strategy").
    2. "seo_title": 45 to 60 characters long. MUST start with or naturally contain the focus keyphrase. Compelling, professional, zero clickbait.
    3. "meta_description": 130 to 155 characters long. MUST contain the exact focus keyphrase and communicate high value.
    4. "slug": Clean, URL-friendly lowercase-hyphenated string containing the focus keyphrase (e.g. "global-supply-chain-disruptions-2026").
    5. "secondary_keywords": 3 to 5 related entities/terms.
    6. "recommended_headings": 4 to 6 H2 heading suggestions incorporating key concepts.
    7. "search_intent": Primary intent description (e.g., "Commercial & Informational research for investors and corporate strategists").
    8. "recommended_word_count": Suggested range (e.g., "1000 - 1500 words").
    9. "image_alt_text": Descriptive alt text containing the focus keyphrase.
    
    Return STRICTLY a JSON object with these exact keys:
    {{
        "focus_keyphrase": "...",
        "seo_title": "...",
        "meta_description": "...",
        "slug": "...",
        "search_intent": "...",
        "target_audience": "Decision Makers & Investors",
        "secondary_keywords": ["...", "..."],
        "recommended_headings": ["...", "..."],
        "recommended_word_count": "1000 - 1400 words",
        "image_alt_text": "..."
    }}
    """
    
    parsed, model_used = call_llm_json(prompt, role="REASONING")
    if parsed and isinstance(parsed, dict) and parsed.get("focus_keyphrase") and parsed.get("seo_title"):
        # Sanitize slug
        raw_slug = parsed.get("slug", "")
        clean_slug = re.sub(r'[^a-zA-Z0-9\-]+', '-', raw_slug).strip('-').lower()
        parsed["slug"] = clean_slug or re.sub(r'[^a-zA-Z0-9\-]+', '-', parsed["focus_keyphrase"]).strip('-').lower()
        return parsed
        
    # Robust fallback SEO Brief
    default_kw = derive_focus_keyphrase(topic_title)
    default_slug = re.sub(r'[^a-zA-Z0-9\-]+', '-', default_kw.lower()).strip('-')
    default_title = f"{default_kw}: Strategic Implications & Market Outlook"[:60]
    default_desc = f"An executive analysis of {default_kw}, examining key market drivers, economic risks, and strategic implications for global investors."[:150]
    
    return {
        "focus_keyphrase": default_kw,
        "seo_title": default_title,
        "meta_description": default_desc,
        "slug": default_slug,
        "search_intent": "Informational & Commercial Analysis for Executives",
        "target_audience": "Decision Makers & Investors",
        "secondary_keywords": subtopics[:4] if subtopics else ["Market Impact", "Financial Analysis"],
        "recommended_headings": [
            f"Strategic Context of {default_kw}",
            "Market Developments & Key Drivers",
            "Financial & Economic Implications",
            "Risks, Challenges, and Outlook"
        ],
        "recommended_word_count": "1000 - 1400 words",
        "image_alt_text": f"Overview of {default_kw} developments and market data"
    }


def compute_content_diff(original: str, revised: str) -> Dict[str, Any]:
    """
    Computes unified diff and summary statistics between original and revised text.
    """
    orig_lines = original.splitlines(keepends=True)
    rev_lines = revised.splitlines(keepends=True)
    
    diff = list(difflib.unified_diff(orig_lines, rev_lines, fromfile="Original", tofile="Optimized", n=2))
    
    orig_words = len(strip_html_markdown(original).split())
    rev_words = len(strip_html_markdown(revised).split())
    
    additions = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
    deletions = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))
    
    return {
        "diff_text": "".join(diff[:250]),  # Limit sample
        "original_word_count": orig_words,
        "revised_word_count": rev_words,
        "word_delta": rev_words - orig_words,
        "lines_added": additions,
        "lines_deleted": deletions
    }


def execute_targeted_optimization(
    db: Session,
    article: GeneratedArticle,
    audit: ArticleAudit,
    max_passes: int = 1
) -> Dict[str, Any]:
    """
    Executes targeted AI revision pass on an article guided strictly by detected audit issues.
    Prioritizes:
    1. Factual integrity and preservation of all figures/numbers/quotes.
    2. Splitting sentences > 20 words.
    3. Injecting transition words to exceed 30%.
    4. Converting passive voice to active voice.
    5. Formatting paragraphs to <= 150 words.
    6. Inserting subheadings if any section > 300 words.
    7. Ensuring focus keyphrase is naturally in title, introduction, and headings.
    """
    focus_kw = audit.focus_keyphrase or derive_focus_keyphrase(article.title)
    
    # Collect key facts from claims for strict verification
    claims = db.query(Claim).filter(Claim.article_id == article.id).all()
    fact_constraints = "\n".join([f"- {c.claim_text} ({c.evidence or ''})" for c in claims[:15]])
    
    # Filter high priority issues
    readability_issues = [i for i in audit.issues if i.get("category") == "readability" and i.get("severity") in ["error", "warning"]]
    seo_issues = [i for i in audit.issues if i.get("category") == "seo" and i.get("severity") in ["error", "warning"]]
    
    issues_summary = ""
    for idx, iss in enumerate((readability_issues + seo_issues)[:8]):
        issues_summary += f"{idx+1}. [{iss.get('category').upper()}] {iss.get('title')}: {iss.get('recommendation')}\n"
        if iss.get("snippet"):
            issues_summary += f"   Affected text: \"{iss.get('snippet')[:100]}...\"\n"

    seo_meta = article.seo_metadata or {}
    current_title = article.title or ""
    current_subtitle = article.subtitle or ""
    current_content = article.content or ""
    
    prompt = f"""
    You are an Executive Editor-in-Chief and Yoast SEO Master Editor at Inpartner.
    
    ARTICLE TO RE-OPTIMIZE:
    Current Title: "{current_title}"
    Current Subtitle: "{current_subtitle}"
    Focus Keyphrase: "{focus_kw}"
    
    DETECTED AUDIT ISSUES TO FIX:
    {issues_summary}
    
    FACTUAL CONSTRAINTS (STRICT RULE — DO NOT HALLUCINATE OR CHANGE DATA):
    {fact_constraints if fact_constraints else "Preserve all existing numbers, percentages, company names, and dates exactly as written."}
    
    REVISION DIRECTIVES (YOAST SEO & READABILITY REQUIREMENTS):
    1. SENTENCE LENGTH: Break sentences exceeding 20 words into 2 concise, clear sentences (target 14-18 words).
    2. TRANSITION WORDS: Add natural transitions (e.g., 'However,', 'Therefore,', 'Consequently,', 'In contrast,', 'Furthermore,', 'As a result,', 'Meanwhile,') so at least 35% of sentences contain a transition word.
    3. PASSIVE VOICE: Change passive sentences (e.g. 'was announced by') into active voice (e.g. 'announced'). Keep passive voice strictly below 10%.
    4. PARAGRAPH LENGTH: Keep paragraphs to 2 to 4 sentences (strictly under 140 words). No massive blocks of text.
    5. HEADINGS (H2/H3): Ensure every section has a descriptive heading. Break sections longer than 280 words with an H3 subheading.
    6. FOCUS KEYPHRASE PLACEMENT:
       - The focus keyphrase "{focus_kw}" MUST appear naturally in the very first paragraph (first 2 sentences).
       - The focus keyphrase or core terms MUST appear in at least two H2/H3 subheadings.
       - Ensure natural keyword density (between 0.8% and 2.0%). DO NOT stuff keywords.
    7. SEO TITLE & META DESCRIPTION:
       - Optimized SEO Title: 45 to 60 characters containing "{focus_kw}".
       - Optimized Meta Description: 130 to 155 characters summarizing the article with "{focus_kw}".
    
    OUTPUT FORMAT:
    Output strictly a JSON object with these exact keys:
    {{
        "optimized_title": "...",
        "optimized_subtitle": "...",
        "optimized_seo_title": "...",
        "optimized_meta_description": "...",
        "optimized_slug": "...",
        "optimized_content": "Full revised article markdown with ## headings",
        "change_summary": "Bullet points summarizing what was changed"
    }}
    
    ORIGINAL ARTICLE CONTENT:
    {current_content}
    """
    
    revised_data, model_used = call_llm_json(prompt, role="COMPOSITION")
    
    if not revised_data or not isinstance(revised_data, dict) or not revised_data.get("optimized_content"):
        return {
            "success": False,
            "error": "Optimization model call failed or returned incomplete format."
        }
        
    rev_content = revised_data.get("optimized_content", "").strip()
    rev_title = revised_data.get("optimized_title") or current_title
    rev_subtitle = revised_data.get("optimized_subtitle") or current_subtitle
    rev_seo_title = revised_data.get("optimized_seo_title") or rev_title
    rev_meta_desc = revised_data.get("optimized_meta_description") or rev_subtitle
    rev_slug = revised_data.get("optimized_slug") or seo_meta.get("slug") or re.sub(r'[^a-zA-Z0-9\-]+', '-', focus_kw.lower()).strip('-')
    change_summary = revised_data.get("change_summary", "Targeted SEO and readability enhancements applied.")
    
    # Calculate deterministic metrics on revised content
    rev_readability = analyze_readability(rev_content, title=rev_title, subtitle=rev_subtitle)
    rev_seo_meta = {
        "focus_keyphrase": focus_kw,
        "seo_title": rev_seo_title,
        "meta_description": rev_meta_desc,
        "slug": rev_slug,
        "title": rev_title,
        "description": rev_meta_desc
    }
    rev_seo = analyze_seo(
        content=rev_content,
        title=rev_title,
        subtitle=rev_subtitle,
        seo_metadata=rev_seo_meta,
        user_prompt=article.user_prompt or ""
    )
    
    diff_data = compute_content_diff(current_content, rev_content)
    
    return {
        "success": True,
        "title": rev_title,
        "subtitle": rev_subtitle,
        "content": rev_content,
        "seo_metadata": rev_seo_meta,
        "change_summary": change_summary,
        "model_used": model_used,
        "diff_data": diff_data,
        "before_scores": {
            "seo": audit.seo_score,
            "seo_score": audit.seo_score,
            "seo_status": audit.seo_status,
            "readability": audit.readability_score,
            "readability_score": audit.readability_score,
            "readability_status": audit.readability_status
        },
        "after_scores": {
            "seo": rev_seo["score"],
            "seo_score": rev_seo["score"],
            "seo_status": rev_seo["status"],
            "readability": rev_readability["score"],
            "readability_score": rev_readability["score"],
            "readability_status": rev_readability["status"]
        },
        "after_issues": rev_readability["issues"] + rev_seo["issues"]
    }


def optimize_article_and_create_revision(
    db: Session,
    article_id: int,
    auto_accept: bool = False
) -> Dict[str, Any]:
    """
    Runs full audit, executes targeted optimization, and creates a revision record in `article_revisions`.
    If auto_accept is True (e.g., during initial generation pipeline), applies changes immediately.
    If False, leaves revision as 'pending_review' so admin can compare diff and approve.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return {"success": False, "error": f"Article #{article_id} not found."}
        
    # 1. Run baseline audit
    audit = run_article_audit(db, article_id)
    if not audit:
        return {"success": False, "error": "Failed to run baseline audit."}
        
    # 2. Execute targeted optimization
    opt_res = execute_targeted_optimization(db, article, audit)
    if not opt_res.get("success"):
        return opt_res
        
    # Get current revision count for this article
    rev_count = db.query(ArticleRevision).filter(ArticleRevision.article_id == article.id).count()
    
    # 3. Create revision record
    revision = ArticleRevision(
        article_id=article.id,
        revision_number=rev_count + 1,
        created_at=datetime.utcnow(),
        source_type="ai_optimization",
        title=opt_res["title"],
        subtitle=opt_res["subtitle"],
        content=opt_res["content"],
        seo_metadata=opt_res["seo_metadata"],
        change_summary=opt_res["change_summary"],
        status="accepted" if auto_accept else "pending_review",
        diff_data=opt_res["diff_data"],
        audit_snapshot={
            "before": opt_res["before_scores"],
            "after": opt_res["after_scores"],
            "issues_resolved": max(0, len(audit.issues) - len(opt_res["after_issues"]))
        }
    )
    db.add(revision)
    db.flush()
    
    if auto_accept:
        # Apply changes immediately to GeneratedArticle
        article.title = opt_res["title"]
        article.subtitle = opt_res["subtitle"]
        article.content = opt_res["content"]
        article.seo_metadata = opt_res["seo_metadata"]
        article.last_optimized_at = datetime.utcnow()
        article.optimization_status = "OPTIMIZED"
        db.commit()
        
        # Re-run audit to save post-optimization audit as latest
        new_audit = run_article_audit(db, article.id)
    else:
        article.optimization_status = "REVISION_PENDING"
        db.commit()
        
    return {
        "success": True,
        "revision_id": revision.id,
        "revision_number": revision.revision_number,
        "status": revision.status,
        "article_id": article.id,
        "before_scores": opt_res["before_scores"],
        "after_scores": opt_res["after_scores"],
        "initial_scores": opt_res["before_scores"],
        "final_scores": opt_res["after_scores"],
        "score_improvement": {
            "seo_delta": opt_res["after_scores"]["seo_score"] - opt_res["before_scores"]["seo_score"],
            "readability_delta": opt_res["after_scores"]["readability_score"] - opt_res["before_scores"]["readability_score"]
        },
        "change_summary": opt_res["change_summary"],
        "changes_applied": opt_res.get("change_summary", []),
        "diff_data": opt_res["diff_data"],
        "title": opt_res["title"],
        "subtitle": opt_res["subtitle"],
        "seo_metadata": opt_res["seo_metadata"]
    }


def accept_article_revision(db: Session, revision_id: int) -> Dict[str, Any]:
    """
    Accepts a pending revision, applies it to the active article, and re-audits.
    """
    revision = db.query(ArticleRevision).filter(ArticleRevision.id == revision_id).first()
    if not revision:
        return {"success": False, "error": "Revision not found."}
        
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == revision.article_id).first()
    if not article:
        return {"success": False, "error": "Associated article not found."}
        
    # Apply revision
    article.title = revision.title
    article.subtitle = revision.subtitle
    article.content = revision.content
    if revision.seo_metadata:
        article.seo_metadata = revision.seo_metadata
        if revision.seo_metadata.get("focus_keyphrase"):
            article.focus_keyphrase = revision.seo_metadata["focus_keyphrase"]
            
    article.last_optimized_at = datetime.utcnow()
    article.optimization_status = "OPTIMIZED"
    
    # Mark other revisions as archived, this one as accepted
    db.query(ArticleRevision).filter(
        ArticleRevision.article_id == article.id,
        ArticleRevision.id != revision.id,
        ArticleRevision.status == "pending_review"
    ).update({"status": "archived"})
    
    revision.status = "accepted"
    db.commit()
    
    # Re-audit
    new_audit = run_article_audit(db, article.id)
    
    return {
        "success": True,
        "message": f"Revision #{revision.revision_number} successfully accepted and applied.",
        "article_id": article.id,
        "seo_score": article.seo_score,
        "seo_status": article.seo_status,
        "readability_score": article.readability_score,
        "readability_status": article.readability_status
    }


def reject_article_revision(db: Session, revision_id: int) -> Dict[str, Any]:
    """
    Rejects a pending revision without modifying the active article.
    """
    revision = db.query(ArticleRevision).filter(ArticleRevision.id == revision_id).first()
    if not revision:
        return {"success": False, "error": "Revision not found."}
        
    revision.status = "rejected"
    
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == revision.article_id).first()
    if article and article.optimization_status == "REVISION_PENDING":
        article.optimization_status = "ORIGINAL"
        
    db.commit()
    return {
        "success": True,
        "message": f"Revision #{revision.revision_number} has been rejected."
    }
