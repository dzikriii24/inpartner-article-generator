import io
import csv
import json
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from pydantic import BaseModel

from app.core.database import get_db, SessionLocal
from app.models.schema import Company, CompanyProfessional, DiscoveryJob
from app.services.professional_finder import professional_finder
from app.services.role_classifier import role_classifier

router = APIRouter(prefix="/professionals", tags=["HR & Decision Makers"])

class ProfessionalUpdate(BaseModel):
    person_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    seniority_level: Optional[str] = None
    profile_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    verification_status: Optional[str] = None
    relevance_score: Optional[float] = None
    relevance_reason: Optional[str] = None
    outreach_status: Optional[str] = None
    is_do_not_contact: Optional[bool] = None
    outreach_notes: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    next_followup_at: Optional[datetime] = None

class ProfessionalCreate(BaseModel):
    person_name: str
    job_title: str
    department: Optional[str] = None
    seniority_level: Optional[str] = None
    profile_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: Optional[str] = "VERIFIED"
    outreach_status: Optional[str] = "NEW_LEAD"
    outreach_notes: Optional[str] = None

@router.get("")
def list_professionals(
    q: Optional[str] = None,
    company_id: Optional[int] = None,
    department: Optional[str] = None,
    seniority_level: Optional[str] = None,
    verification_status: Optional[str] = None,
    outreach_status: Optional[str] = None,
    is_do_not_contact: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("relevance_score", pattern="^(relevance_score|confidence_score|created_at|updated_at|person_name|job_title)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(CompanyProfessional).join(Company, CompanyProfessional.company_id == Company.id)

    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                CompanyProfessional.person_name.ilike(term),
                CompanyProfessional.job_title.ilike(term),
                CompanyProfessional.department.ilike(term),
                Company.input_name.ilike(term),
                Company.official_name.ilike(term)
            )
        )

    if company_id:
        query = query.filter(CompanyProfessional.company_id == company_id)

    if department and department != 'ALL':
        query = query.filter(CompanyProfessional.department == department)

    if seniority_level and seniority_level != 'ALL':
        query = query.filter(CompanyProfessional.seniority_level == seniority_level)

    if verification_status and verification_status != 'ALL':
        query = query.filter(CompanyProfessional.verification_status == verification_status)

    if outreach_status and outreach_status != 'ALL':
        query = query.filter(CompanyProfessional.outreach_status == outreach_status)

    if is_do_not_contact is not None:
        query = query.filter(CompanyProfessional.is_do_not_contact == is_do_not_contact)

    total = query.count()

    order_col = getattr(CompanyProfessional, sort_by, CompanyProfessional.relevance_score)
    if sort_order == "desc":
        query = query.order_by(desc(order_col), desc(CompanyProfessional.created_at))
    else:
        query = query.order_by(asc(order_col), desc(CompanyProfessional.created_at))

    items = query.offset((page - 1) * limit).limit(limit).all()

    formatted_items = []
    for p in items:
        formatted_items.append({
            "id": p.id,
            "company_id": p.company_id,
            "company_name": p.company.official_name or p.company.input_name if p.company else "Unknown",
            "company_website": p.company.website if p.company else None,
            "company_domain": p.company.domain if p.company else None,
            "person_name": p.person_name,
            "job_title": p.job_title,
            "normalized_title": p.normalized_title,
            "department": p.department,
            "seniority_level": p.seniority_level,
            "profile_url": p.profile_url,
            "contact_email": p.contact_email,
            "contact_phone": p.contact_phone,
            "source_url": p.source_url,
            "source_type": p.source_type,
            "source_page_title": p.source_page_title,
            "evidence_text": p.evidence_text,
            "extraction_method": p.extraction_method,
            "verification_status": p.verification_status,
            "confidence_score": p.confidence_score,
            "relevance_score": p.relevance_score,
            "relevance_reason": p.relevance_reason,
            "outreach_status": p.outreach_status,
            "is_do_not_contact": bool(p.is_do_not_contact),
            "outreach_notes": p.outreach_notes,
            "last_contacted_at": p.last_contacted_at.isoformat() if p.last_contacted_at else None,
            "next_followup_at": p.next_followup_at.isoformat() if p.next_followup_at else None,
            "discovery_date": p.discovery_date.isoformat() if p.discovery_date else None,
            "last_verified_at": p.last_verified_at.isoformat() if p.last_verified_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        })

    # Summary breakdown
    dept_stats = dict(db.query(CompanyProfessional.department, func.count(CompanyProfessional.id)).group_by(CompanyProfessional.department).all())
    outreach_stats = dict(db.query(CompanyProfessional.outreach_status, func.count(CompanyProfessional.id)).group_by(CompanyProfessional.outreach_status).all())
    dnc_count = db.query(func.count(CompanyProfessional.id)).filter(CompanyProfessional.is_do_not_contact == True).scalar() or 0

    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "stats": {
            "department_breakdown": dept_stats,
            "outreach_breakdown": outreach_stats,
            "do_not_contact_count": dnc_count
        }
    }

@router.get("/config/target-roles")
def get_target_roles_config():
    """Retrieve configurable target roles dictionary."""
    return role_classifier.get_config()

@router.put("/config/target-roles")
def update_target_roles_config(payload: Dict[str, Any]):
    """Update configurable target roles JSON."""
    success = role_classifier.save_config(payload)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save target roles configuration")
    return {"message": "Target roles configuration saved successfully", "config": role_classifier.get_config()}

@router.get("/export/csv")
def export_professionals_csv(
    q: Optional[str] = None,
    company_id: Optional[int] = None,
    department: Optional[str] = None,
    seniority_level: Optional[str] = None,
    verification_status: Optional[str] = None,
    outreach_status: Optional[str] = None,
    is_do_not_contact: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Generate and stream CSV export of HR & Decision Makers."""
    query = db.query(CompanyProfessional).join(Company, CompanyProfessional.company_id == Company.id)

    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                CompanyProfessional.person_name.ilike(term),
                CompanyProfessional.job_title.ilike(term),
                Company.input_name.ilike(term)
            )
        )
    if company_id:
        query = query.filter(CompanyProfessional.company_id == company_id)
    if department and department != 'ALL':
        query = query.filter(CompanyProfessional.department == department)
    if seniority_level and seniority_level != 'ALL':
        query = query.filter(CompanyProfessional.seniority_level == seniority_level)
    if verification_status and verification_status != 'ALL':
        query = query.filter(CompanyProfessional.verification_status == verification_status)
    if outreach_status and outreach_status != 'ALL':
        query = query.filter(CompanyProfessional.outreach_status == outreach_status)
    if is_do_not_contact is not None:
        query = query.filter(CompanyProfessional.is_do_not_contact == is_do_not_contact)

    items = query.order_by(desc(CompanyProfessional.relevance_score)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Company Name", "Company Website", "Person Name", "Job Title",
        "Department", "Seniority Level", "Profile URL", "Business Email",
        "Business Phone", "Verification Status", "Relevance Score", "Relevance Reason",
        "Outreach Status", "Do Not Contact", "Outreach Notes", "Source URL", "Evidence Text", "Created At"
    ])

    for p in items:
        writer.writerow([
            p.id,
            p.company.official_name or p.company.input_name if p.company else "",
            p.company.website if p.company else "",
            p.person_name,
            p.job_title,
            p.department or "",
            p.seniority_level or "",
            p.profile_url or "",
            p.contact_email or "",
            p.contact_phone or "",
            p.verification_status or "",
            f"{int((p.relevance_score or 0) * 100)}%",
            p.relevance_reason or "",
            p.outreach_status or "NEW_LEAD",
            "YES" if p.is_do_not_contact else "NO",
            p.outreach_notes or "",
            p.source_url or "",
            p.evidence_text or "",
            p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else ""
        ])

    output.seek(0)
    filename = f"inpartner_decision_makers_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{professional_id}")
def get_professional_detail(professional_id: int, db: Session = Depends(get_db)):
    p = db.query(CompanyProfessional).filter(CompanyProfessional.id == professional_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Professional not found")

    return {
        "id": p.id,
        "company_id": p.company_id,
        "company_name": p.company.official_name or p.company.input_name if p.company else "Unknown",
        "company_website": p.company.website if p.company else None,
        "company_domain": p.company.domain if p.company else None,
        "person_name": p.person_name,
        "job_title": p.job_title,
        "normalized_title": p.normalized_title,
        "department": p.department,
        "seniority_level": p.seniority_level,
        "profile_url": p.profile_url,
        "contact_email": p.contact_email,
        "contact_phone": p.contact_phone,
        "source_url": p.source_url,
        "source_type": p.source_type,
        "source_page_title": p.source_page_title,
        "evidence_text": p.evidence_text,
        "extraction_method": p.extraction_method,
        "verification_status": p.verification_status,
        "confidence_score": p.confidence_score,
        "relevance_score": p.relevance_score,
        "relevance_reason": p.relevance_reason,
        "outreach_status": p.outreach_status,
        "is_do_not_contact": bool(p.is_do_not_contact),
        "outreach_notes": p.outreach_notes,
        "last_contacted_at": p.last_contacted_at.isoformat() if p.last_contacted_at else None,
        "next_followup_at": p.next_followup_at.isoformat() if p.next_followup_at else None,
        "discovery_date": p.discovery_date.isoformat() if p.discovery_date else None,
        "last_verified_at": p.last_verified_at.isoformat() if p.last_verified_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None
    }

@router.patch("/{professional_id}")
def update_professional(
    professional_id: int, 
    payload: ProfessionalUpdate, 
    db: Session = Depends(get_db)
):
    p = db.query(CompanyProfessional).filter(CompanyProfessional.id == professional_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Professional not found")

    update_dict = payload.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(p, field, val)

    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)

    return {"message": "Professional updated successfully", "id": p.id}

@router.delete("/{professional_id}")
def delete_professional(professional_id: int, db: Session = Depends(get_db)):
    p = db.query(CompanyProfessional).filter(CompanyProfessional.id == professional_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Professional not found")

    db.delete(p)
    db.commit()
    return {"message": "Professional deleted successfully"}


def _run_discovery_background(company_id: int, company_name: str, website: Optional[str], job_id: int):
    """Background thread for professional discovery."""
    db = SessionLocal()
    try:
        professional_finder.discover_professionals(
            company_name=company_name,
            website=website,
            linkedin_url=None,
            db=db,
            company_id=company_id,
            job_id=job_id
        )
    except Exception as e:
        # Update job as failed
        try:
            job = db.query(DiscoveryJob).filter(DiscoveryJob.id == job_id).first()
            if job:
                job.status = "FAILED"
                job.error_message = "Terjadi kesalahan saat menjalankan discovery"
                job.error_detail = str(e)
                job.completed_at = datetime.utcnow()
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/companies/{company_id}/discover")
def trigger_discover_company_professionals(
    company_id: int, 
    db: Session = Depends(get_db)
):
    """Triggers background HR & decision maker discovery. Returns job ID for polling."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if there's already a running job
    running_job = db.query(DiscoveryJob).filter(
        DiscoveryJob.company_id == company_id,
        DiscoveryJob.status.in_(["QUEUED", "RUNNING"])
    ).first()
    
    if running_job:
        return {
            "message": "Discovery already in progress",
            "job_id": running_job.id,
            "status": running_job.status
        }

    # Create new discovery job
    job = DiscoveryJob(
        company_id=company_id,
        status="QUEUED",
        current_stage="resolving_company",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Start background thread
    thread = threading.Thread(
        target=_run_discovery_background,
        args=(company.id, company.official_name or company.input_name, company.website, job.id),
        daemon=True
    )
    thread.start()

    return {
        "message": f"Discovery started for {company.input_name}",
        "job_id": job.id,
        "status": "QUEUED"
    }


@router.get("/discovery-jobs/{job_id}")
def get_discovery_job_status(job_id: int, db: Session = Depends(get_db)):
    """Poll discovery job status with stage details."""
    job = db.query(DiscoveryJob).filter(DiscoveryJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Discovery job not found")
    
    stages = []
    if job.stages_detail:
        try:
            stages = json.loads(job.stages_detail)
        except Exception:
            pass

    # Get current professionals count
    prof_count = db.query(func.count(CompanyProfessional.id)).filter(
        CompanyProfessional.company_id == job.company_id
    ).scalar() or 0

    return {
        "id": job.id,
        "company_id": job.company_id,
        "status": job.status,
        "current_stage": job.current_stage,
        "stages": stages,
        "total_candidates_raw": job.total_candidates_raw or 0,
        "total_candidates_unique": job.total_candidates_unique or 0,
        "total_verified": job.total_verified or 0,
        "sources_succeeded": job.sources_succeeded or 0,
        "sources_failed": job.sources_failed or 0,
        "professionals_in_db": prof_count,
        "error_message": job.error_message,
        "duration_seconds": job.duration_seconds,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/companies/{company_id}/latest-job")
def get_latest_discovery_job(company_id: int, db: Session = Depends(get_db)):
    """Get the most recent discovery job for a company."""
    job = db.query(DiscoveryJob).filter(
        DiscoveryJob.company_id == company_id
    ).order_by(desc(DiscoveryJob.created_at)).first()
    
    if not job:
        return {"job": None}
    
    stages = []
    if job.stages_detail:
        try:
            stages = json.loads(job.stages_detail)
        except Exception:
            pass

    return {
        "job": {
            "id": job.id,
            "status": job.status,
            "current_stage": job.current_stage,
            "stages": stages,
            "total_candidates_raw": job.total_candidates_raw or 0,
            "total_candidates_unique": job.total_candidates_unique or 0,
            "total_verified": job.total_verified or 0,
            "sources_succeeded": job.sources_succeeded or 0,
            "sources_failed": job.sources_failed or 0,
            "error_message": job.error_message,
            "duration_seconds": job.duration_seconds,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    }


@router.post("/companies/{company_id}")
def create_manual_professional(
    company_id: int, 
    payload: ProfessionalCreate, 
    db: Session = Depends(get_db)
):
    """Manually add a professional to a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Classify role
    cls = role_classifier.classify_role(payload.job_title)

    new_prof = CompanyProfessional(
        company_id=company.id,
        person_name=payload.person_name,
        job_title=payload.job_title,
        normalized_title=cls.get("matched_title"),
        department=payload.department or cls.get("department", "Human Resources"),
        seniority_level=payload.seniority_level or cls.get("seniority_level", "Manager"),
        profile_url=payload.profile_url,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        source_url=payload.source_url or company.website,
        source_type="manual_entry",
        source_page_title="Manual Entry by User",
        evidence_text="Manually added by user",
        extraction_method="manual_entry",
        verification_status=payload.verification_status or "VERIFIED",
        confidence_score=1.0,
        relevance_score=cls.get("relevance_score", 0.85),
        relevance_reason=cls.get("relevance_reason") or "Added manually as verified contact.",
        outreach_status=payload.outreach_status or "NEW_LEAD",
        is_do_not_contact=False,
        outreach_notes=payload.outreach_notes,
        discovery_date=datetime.utcnow(),
        last_verified_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_prof)
    db.commit()
    db.refresh(new_prof)

    return {"message": "Professional added successfully", "id": new_prof.id}
