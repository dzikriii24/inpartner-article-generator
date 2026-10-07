"""
Inpartner Store integration service.

The Article Generator is the *source of truth* for article content (research, AI drafting,
editing). The Inpartner Store is the *selling platform* (pricing, checkout, library).

Two sync directions are supported, both using the same payload produced by
`serialize_article()`:

1. PULL  - the Store calls `GET /api/v1/store/articles[/{id}]` on this app
           (authenticated with the `X-Integration-Key` header).
2. PUSH  - an editor clicks "Push to Store" and this app POSTs the payload to
           `{STORE_API_URL}/integrations/article-generator/webhook`.

Required .env keys:
    STORE_INTEGRATION_KEY=<shared secret, must equal ARTICLE_GENERATOR_KEY in the store .env>
    STORE_API_URL=http://127.0.0.1:8001/api      (Laravel store API base URL)
    GENERATOR_PUBLIC_URL=http://127.0.0.1:8000   (optional, used to absolutize /static images)
"""
import hashlib
import os
import re
from datetime import datetime
from typing import Optional

import markdown as md_lib
import requests

from models import GeneratedArticle, ArticleStatus

# Articles in these states have finished generation and can be sold.
# (DRAFT = article that was edited after it became READY.)
SELLABLE_STATUSES = [
    ArticleStatus.DRAFT,
    ArticleStatus.READY,
    ArticleStatus.SCHEDULED,
    ArticleStatus.PUBLISHED,
    ArticleStatus.WORDPRESS_SYNCED,
]

USER_AGENT = "InpartnerArticleGenerator/1.0"


def get_integration_key() -> str:
    return (os.getenv("STORE_INTEGRATION_KEY") or "").strip()


def get_store_api_url() -> str:
    return (os.getenv("STORE_API_URL") or "").strip().rstrip("/")


def get_public_base_url(fallback: Optional[str] = None) -> str:
    url = (os.getenv("GENERATOR_PUBLIC_URL") or fallback or "").strip()
    return url.rstrip("/")


def is_valid_key(provided: Optional[str]) -> bool:
    expected = get_integration_key()
    if not expected or not provided:
        return False
    # constant-time comparison
    return hashlib.sha256(provided.encode()).digest() == hashlib.sha256(expected.encode()).digest()


def _status_value(article: GeneratedArticle) -> str:
    st = article.status
    return st.value if hasattr(st, "value") else (str(st) if st else "DRAFT")


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _absolutize_urls(html_text: str, base_url: str) -> str:
    """Rewrite root-relative /static and /inpartner/static URLs so the store can render them."""
    if not html_text or not base_url:
        return html_text or ""
    return re.sub(
        r'(src|href)=(["\'])(/(?:inpartner/)?static/)',
        lambda m: f"{m.group(1)}={m.group(2)}{base_url}{m.group(3)}",
        html_text,
    )


def _absolutize_single(url: Optional[str], base_url: str) -> Optional[str]:
    if not url:
        return None
    if url.startswith("/") and base_url:
        return f"{base_url}{url}"
    return url


def render_content_html(article: GeneratedArticle, base_url: str = "") -> str:
    body = md_lib.markdown((article.content or "").strip(), extensions=["extra", "nl2br", "tables"])
    return _absolutize_urls(body, base_url)


def plain_text(html_text: str) -> str:
    txt = re.sub(r"<[^>]+>", " ", html_text or "")
    return re.sub(r"\s+", " ", txt).strip()


def content_hash(article: GeneratedArticle) -> str:
    """Fingerprint of everything the store displays. Changes => store re-syncs the product."""
    parts = [
        article.title or "",
        article.subtitle or "",
        article.content or "",
        article.category or "",
        article.author or "",
        str(article.reading_time or ""),
        article.hero_image_url or "",
        article.hero_image_caption or "",
        _status_value(article),
        "|".join(str(s.id) for s in (article.sources or [])),
    ]
    return hashlib.sha256("\x1f".join(parts).encode("utf-8", "ignore")).hexdigest()


def serialize_article_summary(article: GeneratedArticle, base_url: str = "") -> dict:
    hero = article.hero_image_url or ""
    return {
        "id": article.id,
        "title": article.title,
        "subtitle": article.subtitle,
        "category": article.category,
        "author": article.author,
        "reading_time": article.reading_time,
        # base64 data URLs can be huge; the list endpoint only signals that a hero exists.
        "hero_image_url": None if hero.startswith("data:") else _absolutize_single(hero, base_url),
        "has_hero_image": bool(hero),
        "status": _status_value(article),
        "is_sellable": article.status in SELLABLE_STATUSES and bool((article.content or "").strip()),
        "generated_at": _iso(article.generated_at),
        "published_at": _iso(article.published_at),
        "content_hash": content_hash(article),
    }


def serialize_article(article: GeneratedArticle, base_url: str = "") -> dict:
    """Full article payload used by both the pull API and the push webhook."""
    html_body = render_content_html(article, base_url)
    text = plain_text(html_body)
    seo = article.seo_metadata if isinstance(article.seo_metadata, dict) else {}

    sources = []
    for s in article.sources or []:
        sources.append({
            "title": s.title,
            "url": s.url,
            "publisher": s.publisher,
            "published_at": _iso(s.published_at),
        })

    return {
        **serialize_article_summary(article, base_url),
        "hero_image_url": _absolutize_single(article.hero_image_url, base_url),
        "hero_image_caption": article.hero_image_caption,
        "content_markdown": article.content or "",
        "content_html": html_body,
        "excerpt": (article.subtitle or text[:280]).strip(),
        "word_count": len(text.split()) if text else 0,
        "seo": {
            "meta_title": seo.get("meta_title") or seo.get("title") or article.title,
            "meta_description": seo.get("meta_description") or seo.get("description") or (article.subtitle or text[:160]),
            "keywords": seo.get("keywords") or seo.get("tags") or [],
        },
        "sources": sources,
        "export_urls": {
            "pdf": f"{base_url}/api/article/{article.id}/export/pdf" if base_url else None,
        },
    }


def push_article_to_store(article: GeneratedArticle, base_url: str = "") -> dict:
    """POST the serialized article to the store webhook. Store creates/updates a DRAFT product."""
    store_url = get_store_api_url()
    key = get_integration_key()
    if not store_url or not key:
        return {
            "success": False,
            "error": "Store integration is not configured. Set STORE_API_URL and STORE_INTEGRATION_KEY in .env.",
        }

    if article.status not in SELLABLE_STATUSES or not (article.content or "").strip():
        return {
            "success": False,
            "error": f"Article is not ready to sell yet (status: {_status_value(article)}).",
        }

    payload = {"event": "article.upserted", "article": serialize_article(article, base_url)}
    try:
        resp = requests.post(
            f"{store_url}/integrations/article-generator/webhook",
            json=payload,
            headers={"X-Integration-Key": key, "User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=30,
        )
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        if resp.status_code in (200, 201):
            return {"success": True, **data}
        return {
            "success": False,
            "error": data.get("message") or f"Store responded HTTP {resp.status_code}: {resp.text[:200]}",
        }
    except Exception as e:
        return {"success": False, "error": f"Cannot reach store: {e}"}


def get_store_product_status(article_id: int) -> dict:
    """Ask the store how this article is listed (product status, price, sales)."""
    store_url = get_store_api_url()
    key = get_integration_key()
    if not store_url or not key:
        return {"success": False, "configured": False, "error": "Store integration is not configured."}
    try:
        resp = requests.get(
            f"{store_url}/integrations/article-generator/articles/{article_id}",
            headers={"X-Integration-Key": key, "User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=10,
        )
        if resp.status_code == 404:
            return {"success": True, "configured": True, "listed": False}
        if resp.status_code == 200:
            return {"success": True, "configured": True, "listed": True, **resp.json()}
        return {"success": False, "configured": True, "error": f"Store responded HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "configured": True, "error": f"Cannot reach store: {e}"}
