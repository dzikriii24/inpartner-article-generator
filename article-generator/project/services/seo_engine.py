import re
import html
import math
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from models import GeneratedArticle, ArticleAudit

# ---------------------------------------------------------------------------
# Transition Words & Phrases Dictionary (English)
# ---------------------------------------------------------------------------
TRANSITION_WORDS = {
    # Cause & Effect / Result
    "accordingly", "as a result", "consequently", "for this reason", "hence",
    "so", "then", "therefore", "thus", "thereby", "as a consequence",
    # Contrast & Comparison
    "although", "at the same time", "by contrast", "by comparison", "conversely",
    "despite this", "despite", "even so", "even though", "however", "in contrast",
    "in spite of", "meanwhile", "nevertheless", "nonetheless", "on the contrary",
    "on the other hand", "regardless", "still", "whereas", "while", "yet",
    # Addition & Elaboration
    "additionally", "along with", "also", "and", "as well as", "besides",
    "furthermore", "in addition", "in fact", "moreover", "not only", "what is more",
    # Example & Illustration
    "for example", "for instance", "in particular", "namely", "specifically",
    "such as", "to illustrate", "to demonstrate",
    # Sequence & Time
    "afterward", "afterwards", "at first", "concurrently", "eventually",
    "finally", "first", "firstly", "in the meantime", "initially", "later",
    "next", "previously", "second", "secondly", "simultaneously",
    "subsequently", "then", "third", "thirdly", "ultimately",
    # Summary & Conclusion
    "in conclusion", "in short", "in summary", "overall", "to conclude",
    "to summarize", "to sum up",
    # Emphasis & Agreement
    "above all", "certainly", "clearly", "evidently", "importantly", "indeed",
    "in truth", "naturally", "obviously", "of course", "undoubtedly", "without doubt",
    # Clarification
    "in other words", "that is to say", "to put it another way", "that said"
}

# Regex pattern for English passive voice constructions
PASSIVE_AUXILIARIES = r'\b(am|is|are|was|were|be|been|being|became|become)\b'
PASSIVE_PARTICIPLES = r'\b([a-z]+ed|built|bought|brought|caught|chosen|dealt|drawn|driven|felt|found|given|grown|held|kept|known|laid|led|left|lost|made|meant|paid|read|risen|said|seen|sent|set|shown|sold|spent|spoken|struck|taken|taught|thought|told|understood|won|worn|written)\b'
PASSIVE_REGEX = re.compile(rf"{PASSIVE_AUXILIARIES}\s+(?:[a-z\-]+ly\s+)?{PASSIVE_PARTICIPLES}", re.IGNORECASE)

COMMON_ABBREVIATIONS = {
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "vs.", "etc.", "e.g.", "i.e.",
    "u.s.", "u.k.", "u.n.", "eu.", "corp.", "inc.", "ltd.", "co.", "jan.", "feb.",
    "mar.", "apr.", "jun.", "jul.", "aug.", "sep.", "sept.", "oct.", "nov.", "dec."
}


def strip_html_markdown(text: str) -> str:
    """Strips HTML tags, Markdown markers, and excessive whitespaces."""
    if not text:
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', ' ', text)
    # Strip Markdown links [text](url) -> text
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
    # Strip Markdown bold/italic
    clean = re.sub(r'[*_~`#]', '', clean)
    # Unescape HTML entities
    clean = html.unescape(clean)
    # Normalize whitespaces
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()


def extract_paragraphs(text: str) -> List[str]:
    """Splits markdown or html text into distinct paragraphs, ignoring headings."""
    if not text:
        return []
    
    # Normalize newlines
    normalized = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split by double newlines or block-level HTML tags
    raw_parts = re.split(r'\n\s*\n|<\/?p[^>]*>|<\/?div[^>]*>|<\/?blockquote[^>]*>', normalized)
    
    paragraphs = []
    for part in raw_parts:
        p_clean = strip_html_markdown(part)
        # Skip empty lines, standalone headings, or blockquote markers
        if not p_clean or p_clean.startswith('#') or len(p_clean.split()) < 3:
            continue
        paragraphs.append(p_clean)
        
    return paragraphs


def extract_sentences(text: str) -> List[str]:
    """
    Robust sentence segmentation for English journalistic text.
    Handles common abbreviations (e.g., U.S., Dr., Bank Indonesia, etc.) and decimal numbers.
    """
    clean_text = strip_html_markdown(text)
    if not clean_text:
        return []
        
    # Replace abbreviation dots temporarily with a special placeholder
    def preserve_abbr(match):
        token = match.group(0)
        return token.replace('.', '___DOT___')

    protected = clean_text
    for abbr in COMMON_ABBREVIATIONS:
        pattern = re.compile(re.escape(abbr), re.IGNORECASE)
        protected = pattern.sub(preserve_abbr, protected)
        
    # Protect currency and decimals e.g., 5.2%, $4.5 billion
    protected = re.sub(r'(\d+)\.(\d+)', r'\1___DOT___\2', protected)
    # Protect acronyms like U.S. or P.T.
    protected = re.sub(r'\b([A-Z])\.([A-Z])\.', r'\1___DOT___\2___DOT___', protected)
    
    # Split sentences on standard terminators (. ! ?)
    raw_sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9"\'“‘])', protected)
    
    sentences = []
    for s in raw_sentences:
        restored = s.replace('___DOT___', '.').strip()
        # Clean quotes
        restored = re.sub(r'^["\'“‘]+|["\'”’]+$', '', restored).strip()
        if len(restored.split()) >= 2:
            sentences.append(restored)
            
    return sentences


def count_syllables(word: str) -> int:
    """Estimates syllable count for English words."""
    word = word.lower().strip(".:;?!,'\"-")
    if not word:
        return 0
    if len(word) <= 3:
        return 1
    # Remove silent e at end
    if word.endswith('e') and not word.endswith('le'):
        word = word[:-1]
    vowels = "aeiouy"
    count = 0
    prev_is_vowel = False
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_is_vowel:
            count += 1
        prev_is_vowel = is_vowel
    return max(1, count)


def extract_sections(text: str) -> List[Dict[str, Any]]:
    """
    Splits text into sections defined by Markdown headings (## or ###) or HTML h2/h3.
    Returns list of dicts: {'heading': str, 'level': int, 'content': str, 'word_count': int}.
    """
    if not text:
        return []
    
    # Normalize headings
    lines = text.replace('\r\n', '\n').split('\n')
    sections = []
    curr_heading = "Introduction"
    curr_level = 2
    curr_lines = []
    
    heading_re = re.compile(r'^(#{2,3})\s+(.*)$|<h([23])[^>]*>(.*?)<\/h\3>', re.IGNORECASE)
    
    for line in lines:
        match = heading_re.match(line.strip())
        if match:
            # Save previous section
            body_text = strip_html_markdown("\n".join(curr_lines))
            sections.append({
                "heading": curr_heading,
                "level": curr_level,
                "content": body_text,
                "word_count": len(body_text.split())
            })
            
            # Start new section
            if match.group(1): # Markdown ## or ###
                curr_level = len(match.group(1))
                curr_heading = strip_html_markdown(match.group(2))
            else: # HTML
                curr_level = int(match.group(3))
                curr_heading = strip_html_markdown(match.group(4))
            curr_lines = []
        else:
            curr_lines.append(line)
            
    # Add final section
    body_text = strip_html_markdown("\n".join(curr_lines))
    sections.append({
        "heading": curr_heading,
        "level": curr_level,
        "content": body_text,
        "word_count": len(body_text.split())
    })
    
    return sections


# ---------------------------------------------------------------------------
# READABILITY ANALYZER (Yoast SEO Compatible)
# ---------------------------------------------------------------------------

def analyze_readability(content: str, title: str = "", subtitle: str = "") -> Dict[str, Any]:
    """
    Performs deterministic evaluation of English readability using Yoast SEO criteria:
    1. Sentence length (<= 25% > 20 words)
    2. Paragraph length (<= 150 words per paragraph)
    3. Transition words (>= 30% of sentences contain a transition word)
    4. Passive voice (<= 10% of sentences)
    5. Consecutive sentences (no 3+ sentences starting with the same word)
    6. Subheading distribution (no section > 300 words without a subheading)
    7. Flesch Reading Ease score
    """
    clean_body = strip_html_markdown(content)
    sentences = extract_sentences(content)
    paragraphs = extract_paragraphs(content)
    sections = extract_sections(content)
    
    total_sentences = len(sentences)
    total_paragraphs = len(paragraphs)
    total_words = len(clean_body.split())
    
    if total_sentences == 0 or total_words == 0:
        return {
            "score": 0,
            "status": "poor",
            "metrics": {},
            "issues": [{
                "category": "readability",
                "severity": "error",
                "code": "empty_content",
                "title": "Text is empty",
                "detail": "Please provide article content to evaluate readability.",
                "recommendation": "Write article body text."
            }]
        }
    
    issues: List[Dict[str, Any]] = []
    
    # -----------------------------------------------------------------------
    # 1. Sentence Length Assessment
    # Target: <= 25% of sentences longer than 20 words
    # -----------------------------------------------------------------------
    long_sentences = []
    for s in sentences:
        words = s.split()
        if len(words) > 20:
            long_sentences.append({
                "sentence": s,
                "word_count": len(words)
            })
            
    sentence_len_pct = round((len(long_sentences) / total_sentences) * 100, 1)
    if sentence_len_pct <= 25.0:
        sentence_len_status = "good"
    elif sentence_len_pct <= 30.0:
        sentence_len_status = "ok"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "sentence_length_ok",
            "title": f"Sentence length: {sentence_len_pct}% exceed 20 words",
            "detail": f"{len(long_sentences)} of {total_sentences} sentences contain more than 20 words. Try to stay below 25%.",
            "snippet": long_sentences[0]["sentence"] if long_sentences else "",
            "recommendation": "Split multi-clause sentences with conjunctions (and, but, which) into shorter, punchy sentences."
        })
    else:
        sentence_len_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "sentence_length_poor",
            "title": f"Sentence length: {sentence_len_pct}% exceed 20 words",
            "detail": f"{sentence_len_pct}% of the sentences contain more than 20 words, which is above the 25% maximum.",
            "snippet": long_sentences[0]["sentence"] if long_sentences else "",
            "recommendation": "Shorten long sentences by breaking down complex dependent clauses into distinct thoughts."
        })

    # -----------------------------------------------------------------------
    # 2. Paragraph Length Assessment
    # Target: No paragraph exceeds 150 words
    # -----------------------------------------------------------------------
    long_paragraphs = []
    for p in paragraphs:
        w_count = len(p.split())
        if w_count > 150:
            long_paragraphs.append({
                "paragraph": p[:140] + "...",
                "word_count": w_count
            })
            
    if len(long_paragraphs) == 0:
        paragraph_len_status = "good"
    elif len(long_paragraphs) == 1:
        paragraph_len_status = "ok"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "paragraph_length_ok",
            "title": "1 paragraph is longer than 150 words",
            "detail": f"1 paragraph contains {long_paragraphs[0]['word_count']} words. Consider splitting it into 2 shorter paragraphs.",
            "snippet": long_paragraphs[0]["paragraph"],
            "recommendation": "Aim for 2 to 4 sentences per paragraph for digital readers."
        })
    else:
        paragraph_len_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "paragraph_length_poor",
            "title": f"{len(long_paragraphs)} paragraphs are longer than 150 words",
            "detail": f"{len(long_paragraphs)} paragraphs exceed the recommended 150-word limit.",
            "snippet": long_paragraphs[0]["paragraph"],
            "recommendation": "Break dense blocks of text into smaller paragraphs to improve scannability."
        })

    # -----------------------------------------------------------------------
    # 3. Transition Words Assessment
    # Target: >= 30% of sentences contain a transition word
    # -----------------------------------------------------------------------
    sentences_with_transitions = []
    for s in sentences:
        s_lower = f" {s.lower()} "
        has_trans = False
        for tw in TRANSITION_WORDS:
            # Check either start of sentence, or after comma/semicolon, or with word boundaries
            if s_lower.startswith(f" {tw} ") or f", {tw} " in s_lower or f"; {tw} " in s_lower or f" {tw}," in s_lower:
                has_trans = True
                break
        if has_trans:
            sentences_with_transitions.append(s)
            
    transition_pct = round((len(sentences_with_transitions) / total_sentences) * 100, 1)
    if transition_pct >= 30.0:
        transition_status = "good"
    elif transition_pct >= 20.0:
        transition_status = "ok"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "transition_words_ok",
            "title": f"Transition words: {transition_pct}% of sentences",
            "detail": f"Only {transition_pct}% of sentences contain transition words. The recommended minimum is 30%.",
            "recommendation": "Add linking words like 'However', 'Therefore', 'Consequently', or 'In contrast' to clarify cause and effect."
        })
    else:
        transition_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "transition_words_poor",
            "title": f"Transition words: {transition_pct}% (Below 30%)",
            "detail": f"Only {transition_pct}% of the sentences contain transition words, which is below the recommended 30%.",
            "recommendation": "Connect your ideas using transitions such as 'Furthermore', 'As a result', 'Meanwhile', or 'Nevertheless'."
        })

    # -----------------------------------------------------------------------
    # 4. Passive Voice Assessment
    # Target: <= 10% of sentences contain passive voice
    # -----------------------------------------------------------------------
    passive_sentences = []
    for s in sentences:
        if PASSIVE_REGEX.search(s):
            passive_sentences.append(s)
            
    passive_pct = round((len(passive_sentences) / total_sentences) * 100, 1)
    if passive_pct <= 10.0:
        passive_status = "good"
    elif passive_pct <= 15.0:
        passive_status = "ok"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "passive_voice_ok",
            "title": f"Passive voice: {passive_pct}% of sentences",
            "detail": f"{passive_pct}% of the sentences contain passive voice, which is slightly above the 10% target.",
            "snippet": passive_sentences[0] if passive_sentences else "",
            "recommendation": "Rewrite key sentences using active voice (Subject + Action Verb + Object)."
        })
    else:
        passive_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "passive_voice_poor",
            "title": f"Passive voice: {passive_pct}% (Exceeds 10%)",
            "detail": f"{passive_pct}% of the sentences contain passive voice, which is more than the recommended maximum of 10%.",
            "snippet": passive_sentences[0] if passive_sentences else "",
            "recommendation": "Convert passive constructions to active voice to make the writing direct and authoritative."
        })

    # -----------------------------------------------------------------------
    # 5. Consecutive Sentences Assessment
    # Target: No 3 consecutive sentences starting with the same word
    # -----------------------------------------------------------------------
    consecutive_issues = []
    current_run_word = None
    current_run_count = 0
    
    for s in sentences:
        words = s.split()
        if not words:
            continue
        first_word = re.sub(r'[^a-zA-Z]', '', words[0]).lower()
        if not first_word:
            continue
            
        if first_word == current_run_word:
            current_run_count += 1
            if current_run_count >= 3 and first_word not in consecutive_issues:
                consecutive_issues.append(first_word)
        else:
            current_run_word = first_word
            current_run_count = 1
            
    if len(consecutive_issues) == 0:
        consecutive_status = "good"
    else:
        consecutive_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "consecutive_sentences",
            "title": f"Consecutive sentences starting with '{consecutive_issues[0].capitalize()}'",
            "detail": f"Three or more consecutive sentences start with the exact same word: '{consecutive_issues[0]}'.",
            "recommendation": "Vary your sentence beginnings to keep the reading experience engaging."
        })

    # -----------------------------------------------------------------------
    # 6. Subheading Distribution Assessment
    # Target: No section longer than 300 words without a subheading
    # -----------------------------------------------------------------------
    long_sections = [s for s in sections if s["word_count"] > 300]
    if len(sections) > 1 and len(long_sections) == 0:
        subheading_status = "good"
    elif len(long_sections) == 1:
        subheading_status = "ok"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "subheading_distribution_ok",
            "title": f"Section '{long_sections[0]['heading']}' is {long_sections[0]['word_count']} words",
            "detail": "1 section is longer than 300 words without a subheading.",
            "recommendation": "Add an H3 subheading to divide this section into logical subsections."
        })
    elif len(long_sections) > 1 or (len(sections) == 1 and total_words > 300):
        subheading_status = "poor"
        issues.append({
            "category": "readability",
            "severity": "error",
            "code": "subheading_distribution_poor",
            "title": f"{max(len(long_sections), 1)} section(s) exceed 300 words",
            "detail": "Long blocks of text without subheadings make reading difficult.",
            "recommendation": "Add descriptive H2 or H3 subheadings every 200–280 words."
        })
    else:
        subheading_status = "good"

    # -----------------------------------------------------------------------
    # 7. Flesch Reading Ease Score
    # -----------------------------------------------------------------------
    total_syllables = sum(count_syllables(w) for w in clean_body.split())
    asl = total_words / max(1, total_sentences)
    asw = total_syllables / max(1, total_words)
    flesch_score = round(206.835 - (1.015 * asl) - (84.6 * asw), 1)
    
    if flesch_score >= 60.0:
        flesch_status = "good"
        flesch_note = "Standard reading ease (Easy to read)"
    elif flesch_score >= 45.0:
        flesch_status = "ok"
        flesch_note = "Analytical / Executive level (Good for business readers)"
    else:
        flesch_status = "poor"
        flesch_note = "Very difficult reading ease (Overly dense/academic)"
        issues.append({
            "category": "readability",
            "severity": "warning",
            "code": "flesch_reading_ease_low",
            "title": f"Flesch Reading Ease: {flesch_score} (Complex)",
            "detail": "The text contains very long words and complex sentences.",
            "recommendation": "Use clearer vocabulary and shorter sentence structures."
        })

    # -----------------------------------------------------------------------
    # Overall Readability Score Calculation (0 - 100)
    # -----------------------------------------------------------------------
    score = 100
    # Deductions based on Yoast criteria
    if sentence_len_status == "ok":
        score -= 8
    elif sentence_len_status == "poor":
        score -= 22
        
    if paragraph_len_status == "ok":
        score -= 6
    elif paragraph_len_status == "poor":
        score -= 16
        
    if transition_status == "ok":
        score -= 8
    elif transition_status == "poor":
        score -= 22
        
    if passive_status == "ok":
        score -= 6
    elif passive_status == "poor":
        score -= 18
        
    if consecutive_status == "poor":
        score -= 12
        
    if subheading_status == "ok":
        score -= 5
    elif subheading_status == "poor":
        score -= 14
        
    if flesch_status == "poor":
        score -= 8
        
    final_score = max(10, min(100, score))
    if final_score >= 80:
        overall_status = "good"
    elif final_score >= 60:
        overall_status = "ok"
    else:
        overall_status = "poor"

    metrics = {
        "sentence_length": {
            "total_sentences": total_sentences,
            "long_sentences_count": len(long_sentences),
            "percentage": sentence_len_pct,
            "status": sentence_len_status,
            "target": "<= 25%",
            "message": f"{sentence_len_pct}% > 20 words (target <= 25%)",
            "top_long_sentences": [s["sentence"] for s in long_sentences[:5]]
        },
        "paragraph_length": {
            "total_paragraphs": total_paragraphs,
            "long_paragraphs_count": len(long_paragraphs),
            "status": paragraph_len_status,
            "target": "<= 150 words",
            "message": f"{len(long_paragraphs)} long paragraphs (target <= 150 words)"
        },
        "transition_words": {
            "total_sentences": total_sentences,
            "with_transitions_count": len(sentences_with_transitions),
            "percentage": transition_pct,
            "status": transition_status,
            "target": ">= 30%",
            "message": f"{transition_pct}% of sentences (target >= 30%)"
        },
        "passive_voice": {
            "total_sentences": total_sentences,
            "passive_count": len(passive_sentences),
            "percentage": passive_pct,
            "status": passive_status,
            "target": "<= 10%",
            "message": f"{passive_pct}% passive sentences (target <= 10%)",
            "top_passive_sentences": passive_sentences[:5]
        },
        "consecutive_sentences": {
            "repeating_words": consecutive_issues,
            "status": consecutive_status,
            "target": "None",
            "message": "No consecutive repeats" if len(consecutive_issues) == 0 else f"Repeats: {', '.join(consecutive_issues[:2])}"
        },
        "subheading_distribution": {
            "sections_count": len(sections),
            "long_sections_count": len(long_sections),
            "status": subheading_status,
            "target": "<= 300 words",
            "message": f"{len(long_sections)} section(s) > 300 words" if len(long_sections) > 0 else "Good distribution"
        },
        "flesch_reading_ease": {
            "score": flesch_score,
            "status": flesch_status,
            "note": flesch_note,
            "target": "50 - 70",
            "message": f"Score {flesch_score}/100 ({flesch_note})"
        }
    }

    return {
        "score": final_score,
        "status": overall_status,
        "metrics": metrics,
        "issues": issues,
        "total_words": total_words,
        "total_sentences": total_sentences,
        "total_paragraphs": total_paragraphs
    }


# ---------------------------------------------------------------------------
# SEO VALIDATOR (Yoast SEO Compatible)
# ---------------------------------------------------------------------------

def derive_focus_keyphrase(title: str, user_prompt: str = "") -> str:
    """Derives an intelligent default focus keyphrase from title or prompt if none is set."""
    source_text = title or user_prompt or "Business Analysis"
    clean = re.sub(r'[^\w\s]', '', source_text).strip()
    words = clean.split()
    # Filter common stop words
    stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "of", "from", "how", "what", "why"}
    meaningful = [w for w in words if w.lower() not in stop_words]
    if len(meaningful) >= 4:
        return " ".join(meaningful[:4])
    elif len(meaningful) >= 2:
        return " ".join(meaningful)
    return clean[:35]


def analyze_seo(
    content: str,
    title: str,
    subtitle: str = "",
    seo_metadata: Optional[Dict[str, Any]] = None,
    user_prompt: str = "",
    sources: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Performs deterministic evaluation of SEO properties using Yoast SEO criteria:
    1. Focus keyphrase in SEO title (and near beginning)
    2. Focus keyphrase in introduction (first paragraph)
    3. Focus keyphrase in headings (H2/H3)
    4. Focus keyphrase density (0.5% - 2.5%)
    5. Focus keyphrase in meta description
    6. SEO title length (40 - 65 characters)
    7. Meta description length (120 - 156 characters)
    8. Slug relevance
    9. Text length (>= 800 words for executive business articles)
    10. Internal & external links
    """
    seo_meta = seo_metadata or {}
    
    # Identify focus keyphrase
    focus_kw = seo_meta.get("focus_keyphrase") or seo_meta.get("focus_kw") or ""
    if not focus_kw or not focus_kw.strip():
        focus_kw = derive_focus_keyphrase(title, user_prompt)
        
    focus_kw = focus_kw.strip()
    focus_kw_lower = focus_kw.lower()
    kw_words = focus_kw_lower.split()
    
    clean_body = strip_html_markdown(content)
    body_words = clean_body.split()
    total_words = len(body_words)
    
    seo_title = seo_meta.get("seo_title") or seo_meta.get("title") or title or ""
    meta_desc = seo_meta.get("meta_description") or seo_meta.get("description") or subtitle or ""
    slug = seo_meta.get("slug") or ""
    
    issues: List[Dict[str, Any]] = []
    score = 100
    
    # -----------------------------------------------------------------------
    # 1. Keyphrase in SEO Title
    # -----------------------------------------------------------------------
    title_lower = seo_title.lower()
    if focus_kw_lower in title_lower:
        kw_in_title_status = "good"
        # Check position (first 50% of title is ideal in Yoast)
        pos = title_lower.find(focus_kw_lower)
        if pos == 0:
            kw_title_pos = "beginning"
        elif pos < len(title_lower) / 2:
            kw_title_pos = "first_half"
        else:
            kw_title_pos = "second_half"
    elif all(w in title_lower for w in kw_words):
        kw_in_title_status = "ok"
        kw_title_pos = "all_words_present"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "keyphrase_in_title_partial",
            "title": "Keyphrase words found in SEO title, but not exact match",
            "detail": f"The focus keyphrase '{focus_kw}' appears partially in the title.",
            "recommendation": "Use the exact keyphrase in the SEO title."
        })
        score -= 6
    else:
        kw_in_title_status = "poor"
        kw_title_pos = "missing"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_in_title_missing",
            "title": f"Focus keyphrase missing from SEO title",
            "detail": f"The focus keyphrase '{focus_kw}' was not found in the SEO title.",
            "recommendation": f"Include '{focus_kw}' near the beginning of your SEO title."
        })
        score -= 18

    # -----------------------------------------------------------------------
    # 2. Keyphrase in Introduction (First Paragraph)
    # -----------------------------------------------------------------------
    paragraphs = extract_paragraphs(content)
    first_p = paragraphs[0].lower() if paragraphs else ""
    if focus_kw_lower in first_p:
        kw_in_intro_status = "good"
    elif all(w in first_p for w in kw_words):
        kw_in_intro_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "keyphrase_in_intro_partial",
            "title": "Keyphrase words present in intro, but not exact match",
            "detail": "All words from your keyphrase appear in the first paragraph, but not together.",
            "recommendation": f"Use the exact phrase '{focus_kw}' in the first paragraph."
        })
        score -= 5
    else:
        kw_in_intro_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_in_intro_missing",
            "title": "Focus keyphrase missing from introduction",
            "detail": f"Your keyphrase '{focus_kw}' does not appear in the first paragraph.",
            "recommendation": "Mention your main keyphrase in the very first sentence or paragraph to clarify search intent."
        })
        score -= 16

    # -----------------------------------------------------------------------
    # 3. Keyphrase in Headings (H2 / H3)
    # Target: 30% to 75% of headings contain keyphrase or synonyms
    # -----------------------------------------------------------------------
    sections = extract_sections(content)
    headings = [s["heading"] for s in sections if s["heading"] != "Introduction"]
    
    h_matched = 0
    for h in headings:
        h_lower = h.lower()
        if focus_kw_lower in h_lower or all(w in h_lower for w in kw_words):
            h_matched += 1
            
    h_total = len(headings)
    h_pct = round((h_matched / max(1, h_total)) * 100, 1) if h_total > 0 else 0.0
    
    if h_total == 0:
        kw_in_headings_status = "poor"
        score -= 12
    elif 25.0 <= h_pct <= 80.0:
        kw_in_headings_status = "good"
    elif h_pct > 80.0:
        kw_in_headings_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "keyphrase_in_headings_overuse",
            "title": f"Keyphrase used in {h_pct}% of headings (Over-optimized)",
            "detail": f"You used the keyphrase in {h_matched} of {h_total} headings. Yoast recommends 30%–75%.",
            "recommendation": "Use synonyms in some subheadings to avoid repetitive phrasing."
        })
        score -= 4
    elif h_pct > 0:
        kw_in_headings_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "keyphrase_in_headings_low",
            "title": f"Keyphrase in {h_pct}% of headings",
            "detail": f"Only {h_matched} of {h_total} subheadings contain the keyphrase. Aim for at least 30%.",
            "recommendation": "Incorporate the focus keyphrase or core terms naturally into 1 more H2 subheading."
        })
        score -= 6
    else:
        kw_in_headings_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_in_headings_none",
            "title": "Keyphrase does not appear in any subheadings",
            "detail": f"None of your {h_total} H2/H3 subheadings reflect '{focus_kw}'.",
            "recommendation": "Add your focus keyphrase to at least one higher-level subheading."
        })
        score -= 15

    # -----------------------------------------------------------------------
    # 4. Keyphrase Density
    # Target: 0.5% to 2.5% of total words
    # -----------------------------------------------------------------------
    body_lower = clean_body.lower()
    # Count exact occurrences
    kw_count = len(re.findall(rf"\b{re.escape(focus_kw_lower)}\b", body_lower))
    kw_density = round(((kw_count * len(kw_words)) / max(1, total_words)) * 100, 2)
    
    if 0.5 <= kw_density <= 2.5:
        density_status = "good"
    elif 0.25 <= kw_density < 0.5:
        density_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "keyphrase_density_low",
            "title": f"Keyphrase density is {kw_density}% (Found {kw_count} times)",
            "detail": "The keyphrase was found fewer times than recommended. Target is between 0.5% and 2.5%.",
            "recommendation": "Naturally integrate your keyphrase 1 to 2 more times in relevant sections."
        })
        score -= 6
    elif kw_density > 2.5:
        density_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_density_high",
            "title": f"Keyphrase density is {kw_density}% (High)",
            "detail": f"The keyphrase was found {kw_count} times, which exceeds the 2.5% threshold.",
            "recommendation": "Remove repetitive keyphrases to avoid search engine penalties for keyword stuffing."
        })
        score -= 15
    else:
        density_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_density_none",
            "title": f"Keyphrase found only {kw_count} time(s) in body",
            "detail": f"The focus keyphrase is virtually absent from the article body.",
            "recommendation": "Weave the keyphrase naturally into the body text where appropriate."
        })
        score -= 18

    # -----------------------------------------------------------------------
    # 5. Keyphrase in Meta Description
    # -----------------------------------------------------------------------
    desc_lower = meta_desc.lower()
    if focus_kw_lower in desc_lower:
        kw_in_meta_status = "good"
    elif all(w in desc_lower for w in kw_words):
        kw_in_meta_status = "ok"
        score -= 3
    else:
        kw_in_meta_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "keyphrase_in_meta_missing",
            "title": "Focus keyphrase missing from meta description",
            "detail": f"The meta description does not contain '{focus_kw}'.",
            "recommendation": "Include the focus keyphrase in your meta description so searchers immediately see relevance."
        })
        score -= 12

    # -----------------------------------------------------------------------
    # 6. SEO Title Length
    # Target: 40 to 65 characters
    # -----------------------------------------------------------------------
    title_len = len(seo_title)
    if 40 <= title_len <= 65:
        title_len_status = "good"
    elif 30 <= title_len < 40 or 66 <= title_len <= 75:
        title_len_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "title_length_ok",
            "title": f"SEO title length: {title_len} characters",
            "detail": "Target range is 40 to 65 characters for optimal Google desktop & mobile display.",
            "recommendation": "Adjust title length so it neither truncates in search results nor appears too brief."
        })
        score -= 5
    else:
        title_len_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "title_length_poor",
            "title": f"SEO title length: {title_len} characters ({'Too short' if title_len < 30 else 'Too long'})",
            "detail": "Titles shorter than 30 chars lack context; titles over 75 chars are heavily truncated in Google SERPs.",
            "recommendation": "Aim for 50–60 characters containing your primary keyword."
        })
        score -= 14

    # -----------------------------------------------------------------------
    # 7. Meta Description Length
    # Target: 120 to 156 characters
    # -----------------------------------------------------------------------
    desc_len = len(meta_desc)
    if 120 <= desc_len <= 156:
        desc_len_status = "good"
    elif 90 <= desc_len < 120 or 157 <= desc_len <= 175:
        desc_len_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "meta_desc_length_ok",
            "title": f"Meta description length: {desc_len} characters",
            "detail": "Yoast recommends 120 to 156 characters for best click-through rates.",
            "recommendation": "Expand or trim your meta description to fit cleanly in search snippets."
        })
        score -= 4
    else:
        desc_len_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "meta_desc_length_poor",
            "title": f"Meta description length: {desc_len} characters ({'Too short' if desc_len < 90 else 'Too long'})",
            "detail": "Descriptions under 90 chars fail to convey value; over 175 chars get cut off with '...'.",
            "recommendation": "Craft a compelling 135–150 character summary with a clear hook."
        })
        score -= 12

    # -----------------------------------------------------------------------
    # 8. Slug Relevance
    # -----------------------------------------------------------------------
    slug_clean = slug.lower().strip()
    kw_slug = re.sub(r'[^a-z0-9]+', '-', focus_kw_lower).strip('-')
    if slug_clean and kw_slug in slug_clean:
        slug_status = "good"
    elif slug_clean:
        # Check if at least 2 words from keyphrase in slug
        matched_slug_words = sum(1 for w in kw_words if w in slug_clean)
        if matched_slug_words >= max(1, len(kw_words) - 1):
            slug_status = "ok"
        else:
            slug_status = "poor"
            issues.append({
                "category": "seo",
                "severity": "warning",
                "code": "slug_missing_keyphrase",
                "title": f"Slug does not match focus keyphrase",
                "detail": f"Current slug '{slug_clean}' does not reflect '{focus_kw}'.",
                "recommendation": f"Consider setting slug to '{kw_slug}'."
            })
            score -= 4
    else:
        slug_status = "ok" # Will be auto-generated upon publishing

    # -----------------------------------------------------------------------
    # 9. Text Length
    # Target: >= 800 words for deep business news & analysis
    # -----------------------------------------------------------------------
    if total_words >= 800:
        text_len_status = "good"
    elif total_words >= 500:
        text_len_status = "ok"
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "text_length_ok",
            "title": f"Article length: {total_words} words",
            "detail": "500–799 words is acceptable, but deep business/investment authority articles rank higher at 800+ words.",
            "recommendation": "Add a strategic implications or market outlook subsection."
        })
        score -= 5
    else:
        text_len_status = "poor"
        issues.append({
            "category": "seo",
            "severity": "error",
            "code": "text_length_poor",
            "title": f"Article length: {total_words} words (Too brief)",
            "detail": "Articles under 500 words lack the depth expected by business executives and search engines.",
            "recommendation": "Expand analysis with supporting data, market context, and expert perspectives."
        })
        score -= 15

    # -----------------------------------------------------------------------
    # 10. External & Internal Links
    # -----------------------------------------------------------------------
    has_links = bool(re.search(r'https?://[^\s<>"]+|href=', content)) or bool(sources and len(sources) > 0)
    links_status = "good" if has_links else "poor"
    if not has_links:
        issues.append({
            "category": "seo",
            "severity": "warning",
            "code": "external_links_missing",
            "title": "No outbound source citations or references",
            "detail": "Citing authoritative sources (e.g., Bloomberg, Reuters, Bank Indonesia) increases domain trust.",
            "recommendation": "Add references and citations to source material."
        })
        score -= 5

    final_score = max(10, min(100, score))
    if final_score >= 80:
        overall_status = "good"
    elif final_score >= 60:
        overall_status = "ok"
    else:
        overall_status = "poor"

    metrics = {
        "focus_keyphrase": focus_kw,
        "keyphrase_in_title": {
            "status": kw_in_title_status,
            "position": kw_title_pos,
            "target": "Present in title",
            "message": "Keyphrase in title" if kw_in_title_status == "good" else "Missing from title"
        },
        "keyphrase_in_intro": {
            "status": kw_in_intro_status,
            "target": "First paragraph",
            "message": "Present in intro paragraph" if kw_in_intro_status == "good" else "Missing from intro paragraph"
        },
        "keyphrase_in_headings": {
            "status": kw_in_headings_status,
            "percentage": h_pct,
            "matched_count": h_matched,
            "total_headings": h_total,
            "target": "30% - 75%",
            "message": f"{h_matched} of {h_total} headings ({h_pct}%)"
        },
        "keyphrase_density": {
            "status": density_status,
            "count": kw_count,
            "density_percentage": kw_density,
            "target": "0.5% - 2.5%",
            "message": f"{kw_count} times ({kw_density}%, target 0.5%–2.5%)"
        },
        "keyphrase_in_meta_description": {
            "status": kw_in_meta_status,
            "target": "Present in meta description",
            "message": "Present in meta description" if kw_in_meta_status == "good" else "Missing from meta description"
        },
        "title_length": {
            "status": title_len_status,
            "length": title_len,
            "target": "40 - 65 characters",
            "message": f"{title_len} chars (target 40–65)"
        },
        "meta_description_length": {
            "status": desc_len_status,
            "length": desc_len,
            "target": "120 - 156 characters",
            "message": f"{desc_len} chars (target 120–156)"
        },
        "slug": {
            "status": slug_status,
            "value": slug_clean or kw_slug,
            "message": f"Slug: {slug_clean or kw_slug}"
        },
        "text_length": {
            "status": text_len_status,
            "word_count": total_words,
            "target": ">= 800 words",
            "message": f"{total_words} words (target >= 800)"
        },
        "links": {
            "status": links_status,
            "has_sources": has_links,
            "message": "Outbound sources cited" if has_links else "No source citations"
        }
    }

    return {
        "score": final_score,
        "status": overall_status,
        "focus_keyphrase": focus_kw,
        "metrics": metrics,
        "issues": issues,
        "seo_title": seo_title,
        "meta_description": meta_desc
    }


# ---------------------------------------------------------------------------
# FULL AUDIT RUNNER & PERSISTENCE
# ---------------------------------------------------------------------------

def run_article_audit(db: Session, article_id: int) -> Optional[ArticleAudit]:
    """
    Executes a complete deterministic SEO & Readability audit for an article,
    records it in `article_audits`, and updates summary columns in `generated_articles`.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return None
        
    readability_res = analyze_readability(
        content=article.content or "",
        title=article.title or "",
        subtitle=article.subtitle or ""
    )
    
    seo_res = analyze_seo(
        content=article.content or "",
        title=article.title or "",
        subtitle=article.subtitle or "",
        seo_metadata=article.seo_metadata,
        user_prompt=article.user_prompt or "",
        sources=article.sources
    )
    
    combined_metrics = {
        "readability": readability_res["metrics"],
        "seo": seo_res["metrics"]
    }
    
    # Combined issues list sorted by severity (error -> warning -> info)
    severity_order = {"error": 0, "warning": 1, "info": 2, "good": 3}
    all_issues = readability_res["issues"] + seo_res["issues"]
    all_issues.sort(key=lambda x: severity_order.get(x.get("severity", "info"), 99))
    
    # Mark previous audits as not latest
    db.query(ArticleAudit).filter(ArticleAudit.article_id == article.id).update({"is_latest": False})
    
    # Create audit record
    audit = ArticleAudit(
        article_id=article.id,
        evaluator_version="yoast-compatible-v1.0",
        audited_at=datetime.utcnow(),
        focus_keyphrase=seo_res["focus_keyphrase"],
        seo_score=seo_res["score"],
        readability_score=readability_res["score"],
        seo_status=seo_res["status"],
        readability_status=readability_res["status"],
        metrics=combined_metrics,
        issues=all_issues,
        is_latest=True
    )
    db.add(audit)
    
    # Update article summary fields for immediate querying
    article.focus_keyphrase = seo_res["focus_keyphrase"]
    article.seo_score = seo_res["score"]
    article.readability_score = readability_res["score"]
    article.seo_status = seo_res["status"].upper()
    article.readability_status = readability_res["status"].upper()
    
    # Sync seo_metadata in article if missing keyphrase or slug
    current_meta = article.seo_metadata or {}
    if not current_meta.get("focus_keyphrase"):
        current_meta["focus_keyphrase"] = seo_res["focus_keyphrase"]
    if not current_meta.get("slug"):
        current_meta["slug"] = seo_res["metrics"]["slug"]["value"]
    if not current_meta.get("title"):
        current_meta["title"] = article.title
    if not current_meta.get("description"):
        current_meta["description"] = article.subtitle
    article.seo_metadata = current_meta
    
    db.commit()
    db.refresh(audit)
    return audit
