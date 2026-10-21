from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import Company, CompanyContact
from app.services.search_engine import CompanySearchEngine

router = APIRouter(prefix="/companies", tags=["Companies"])
search_engine = CompanySearchEngine()

class ContactUpdate(BaseModel):
    contact_type: Optional[str] = None
    contact_person_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    url: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None

class CompanyUpdate(BaseModel):
    official_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    address: Optional[str] = None

@router.get("")
def list_companies(
    q: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("updated_at", regex="^(created_at|updated_at|input_name|matching_confidence)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(Company)

    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                Company.input_name.ilike(term),
                Company.official_name.ilike(term),
                Company.domain.ilike(term),
                Company.industry.ilike(term),
                Company.city.ilike(term)
            )
        )

    if industry:
        query = query.filter(Company.industry.ilike(f"%{industry}%"))

    if city:
        query = query.filter(Company.city.ilike(f"%{city}%"))

    if status and status != 'ALL':
        query = query.filter(Company.search_status == status)

    total = query.count()

    order_col = getattr(Company, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    companies = query.offset((page - 1) * limit).limit(limit).all()

    items = []
    for comp in companies:
        items.append({
            "id": comp.id,
            "input_name": comp.input_name,
            "official_name": comp.official_name,
            "website": comp.website,
            "domain": comp.domain,
            "industry": comp.industry,
            "description": comp.description,
            "city": comp.city,
            "province": comp.province,
            "address": comp.address,
            "matching_confidence": comp.matching_confidence,
            "search_status": comp.search_status or ("COMPLETED" if len(comp.contacts) > 0 else "PARTIAL"),
            "total_contacts": len(comp.contacts),
            "created_at": comp.created_at.isoformat() if comp.created_at else None,
            "updated_at": comp.updated_at.isoformat() if comp.updated_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{company_id}")
def get_company(company_id: int, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    contacts = []
    for c in comp.contacts:
        contacts.append({
            "id": c.id,
            "contact_type": c.contact_type,
            "contact_person_name": c.contact_person_name,
            "job_title": c.job_title,
            "department": c.department,
            "email": c.email,
            "phone": c.phone,
            "address": c.address,
            "url": c.url,
            "source_url": c.source_url,
            "source_domain": c.source_domain,
            "source_page_title": c.source_page_title,
            "source_section": c.source_section,
            "evidence_text": c.evidence_text,
            "extraction_method": c.extraction_method,
            "source_type": c.source_type,
            "verification_status": c.verification_status,
            "confidence_score": c.confidence_score,
            "raw_value": c.raw_value,
            "notes": c.notes,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })

    return {
        "id": comp.id,
        "input_name": comp.input_name,
        "official_name": comp.official_name,
        "normalized_name": comp.normalized_name,
        "website": comp.website,
        "domain": comp.domain,
        "industry": comp.industry,
        "description": comp.description,
        "country": comp.country,
        "province": comp.province,
        "city": comp.city,
        "address": comp.address,
        "search_status": comp.search_status or ("COMPLETED" if len(comp.contacts) > 0 else "PARTIAL"),
        "audit_metadata": comp.audit_metadata,
        "matching_confidence": comp.matching_confidence,
        "data_quality_notes": comp.data_quality_notes,
        "created_at": comp.created_at.isoformat() if comp.created_at else None,
        "updated_at": comp.updated_at.isoformat() if comp.updated_at else None,
        "contacts": contacts
    }

@router.patch("/{company_id}")
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(comp, field, val)
    
    comp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comp)
    return {"message": "Company updated successfully", "id": comp.id}

@router.post("/{company_id}/enrich")
def re_enrich_company(company_id: int, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    result = search_engine.search_and_enrich(comp.input_name, db=db, search_type="manual")
    return {"message": "Re-enrichment completed", "result": result}

@router.post("/{company_id}/contacts")
def add_company_contact(company_id: int, payload: ContactUpdate, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    contact = CompanyContact(
        company_id=comp.id,
        contact_type=payload.contact_type or "general_email",
        contact_person_name=payload.contact_person_name,
        job_title=payload.job_title,
        department=payload.department,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        url=payload.url,
        source_type="manual_entry",
        verification_status=payload.verification_status or "official_published",
        confidence_score=1.0,
        notes=payload.notes or "Added manually by user",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"message": "Contact added successfully", "id": contact.id}

@router.patch("/contacts/{contact_id}")
def update_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db)):
    contact = db.query(CompanyContact).filter(CompanyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(contact, field, val)
    
    contact.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Contact updated successfully"}

@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(CompanyContact).filter(CompanyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}
