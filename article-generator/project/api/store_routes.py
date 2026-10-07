"""
Store integration routes (Article Generator side).

PULL API (consumed by the Inpartner Store, server-to-server):
    GET  /api/v1/store/health
    GET  /api/v1/store/articles?page=1&per_page=50&sellable_only=true&q=
    GET  /api/v1/store/articles/{article_id}
    -> requires header:  X-Integration-Key: <STORE_INTEGRATION_KEY>

EDITOR ACTIONS (used by the article editor UI in this app):
    POST /api/article/{article_id}/push-store
    GET  /api/article/{article_id}/store-status
"""
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from models import GeneratedArticle
from services.store_service import (
    SELLABLE_STATUSES,
    get_public_base_url,
    get_store_api_url,
    get_store_product_status,
    is_valid_key,
    push_article_to_store,
    serialize_article,
    serialize_article_summary,
)

store_router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_integration_key(x_integration_key: Optional[str] = Header(default=None)):
    if not is_valid_key(x_integration_key):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Integration-Key")
    return True


def _base_url(request: Request) -> str:
    return get_public_base_url(str(request.base_url))


# ---------------------------------------------------------------------------
# PULL API (Store -> Generator)
# ---------------------------------------------------------------------------

@store_router.get("/api/v1/store/health")
def store_health(_: bool = Depends(require_integration_key), db: Session = Depends(get_db)):
    total = db.query(GeneratedArticle).filter(GeneratedArticle.status.in_(SELLABLE_STATUSES)).count()
    return {"status": "ok", "app": "inpartner-article-generator", "sellable_articles": total}


@store_router.get("/api/v1/store/articles")
def store_list_articles(
    request: Request,
    page: int = 1,
    per_page: int = 50,
    sellable_only: bool = True,
    q: Optional[str] = None,
    _: bool = Depends(require_integration_key),
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    query = db.query(GeneratedArticle)
    if sellable_only:
        query = query.filter(
            GeneratedArticle.status.in_(SELLABLE_STATUSES),
            GeneratedArticle.content.isnot(None),
            GeneratedArticle.content != "",
        )
    if q:
        query = query.filter(GeneratedArticle.title.ilike(f"%{q.strip()}%"))

    total = query.count()
    rows = (
        query.order_by(GeneratedArticle.generated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    base = _base_url(request)
    return {
        "data": [serialize_article_summary(a, base) for a in rows],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "last_page": max((total + per_page - 1) // per_page, 1),
        },
    }


@store_router.get("/api/v1/store/articles/{article_id}")
def store_get_article(
    article_id: int,
    request: Request,
    _: bool = Depends(require_integration_key),
    db: Session = Depends(get_db),
):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"data": serialize_article(article, _base_url(request))}


# ---------------------------------------------------------------------------
# EDITOR ACTIONS (Generator UI -> Store)
# ---------------------------------------------------------------------------

@store_router.post("/api/article/{article_id}/push-store")
def push_to_store(article_id: int, request: Request, db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)

    res = push_article_to_store(article, _base_url(request))
    if res.get("success"):
        return {"status": "success", **{k: v for k, v in res.items() if k != "success"}}
    return JSONResponse({"status": "error", "message": res.get("error", "Push failed")}, status_code=400)


@store_router.get("/api/article/{article_id}/store-status")
def store_status(article_id: int):
    res = get_store_product_status(article_id)
    res["store_api_url"] = get_store_api_url() or None
    return res
