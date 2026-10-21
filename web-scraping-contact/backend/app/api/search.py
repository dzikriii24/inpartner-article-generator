from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import Company, SearchHistory
from app.services.search_engine import CompanySearchEngine

router = APIRouter(prefix="", tags=["Search"])
search_engine = CompanySearchEngine()

class SearchRequest(BaseModel):
    company_name: str

class BatchSearchRequest(BaseModel):
    companies: List[str]

@router.post("/companies/search")
def manual_search_company(payload: SearchRequest, db: Session = Depends(get_db)):
    """Search, scrape, enrich, and save single company contacts."""
    name = payload.company_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Company name cannot be empty")

    result = search_engine.search_and_enrich(name, db=db, search_type="manual")
    return result

@router.post("/companies/batch-search")
def batch_search_companies(payload: BatchSearchRequest, db: Session = Depends(get_db)):
    """Search and enrich a list of up to 10 company names sequentially."""
    companies = [c.strip() for c in payload.companies if c.strip()]
    if not companies:
        raise HTTPException(status_code=400, detail="Company list cannot be empty")
    if len(companies) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 companies allowed for direct synchronous search. Use Excel Import for larger batches.")

    results = []
    for comp in companies:
        res = search_engine.search_and_enrich(comp, db=db, search_type="batch_single")
        results.append(res)
    return {"results": results}

@router.get("/companies/autocomplete")
def autocomplete(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """Suggest companies based on previously stored entries."""
    matches = db.query(Company.input_name, Company.official_name, Company.domain)\
        .filter(Company.input_name.ilike(f"%{q}%"))\
        .limit(8).all()

    suggestions = []
    for m in matches:
        suggestions.append({
            "name": m.official_name or m.input_name,
            "input_name": m.input_name,
            "domain": m.domain
        })
    return {"suggestions": suggestions}

@router.get("/search-history")
def list_search_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(SearchHistory).order_by(desc(SearchHistory.created_at))
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    formatted = []
    for h in items:
        formatted.append({
            "id": h.id,
            "query": h.query,
            "search_type": h.search_type,
            "company_id": h.company_id,
            "status": h.status,
            "contacts_found_count": h.contacts_found_count,
            "started_at": h.started_at.isoformat() if h.started_at else None,
            "completed_at": h.completed_at.isoformat() if h.completed_at else None,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        })

    return {
        "items": formatted,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/search-history/{history_id}")
def get_search_history_detail(history_id: int, db: Session = Depends(get_db)):
    history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Search history record not found")

    company_data = None
    if history.company:
        comp = history.company
        contacts = [{
            "id": c.id,
            "contact_type": c.contact_type,
            "contact_person_name": c.contact_person_name,
            "job_title": c.job_title,
            "email": c.email,
            "phone": c.phone,
            "url": c.url,
            "source_url": c.source_url,
            "source_type": c.source_type,
            "verification_status": c.verification_status,
            "confidence_score": c.confidence_score
        } for c in comp.contacts]

        company_data = {
            "id": comp.id,
            "input_name": comp.input_name,
            "official_name": comp.official_name,
            "website": comp.website,
            "industry": comp.industry,
            "description": comp.description,
            "city": comp.city,
            "address": comp.address,
            "contacts": contacts
        }

    return {
        "id": history.id,
        "query": history.query,
        "search_type": history.search_type,
        "status": history.status,
        "contacts_found_count": history.contacts_found_count,
        "created_at": history.created_at.isoformat() if history.created_at else None,
        "company": company_data
    }
