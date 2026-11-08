from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.schema import Company, CompanyContact, CompanyProfessional, SearchHistory, ImportBatch
from app.workers.batch_worker import batch_manager

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch live KPIs and recent activity for Dashboard."""
    total_companies = db.query(Company).count()
    total_contacts = db.query(CompanyContact).count()
    total_professionals = db.query(CompanyProfessional).count()
    total_verified_profs = db.query(CompanyProfessional).filter(CompanyProfessional.verification_status == "VERIFIED").count()
    active_leads = db.query(CompanyProfessional).filter(CompanyProfessional.outreach_status.in_(["READY_TO_CONTACT", "CONTACTED", "FOLLOW_UP"])).count()
    total_searches = db.query(SearchHistory).count()
    total_batches = db.query(ImportBatch).count()

    active_jobs = len(batch_manager.active_batches)
    failed_jobs = db.query(ImportBatch).filter(ImportBatch.status == "FAILED").count()

    # Recent searches
    recent_searches_records = db.query(SearchHistory).order_by(desc(SearchHistory.created_at)).limit(5).all()
    recent_searches = [{
        "id": s.id,
        "query": s.query,
        "status": s.status,
        "contacts_found_count": s.contacts_found_count,
        "created_at": s.created_at.isoformat() if s.created_at else None
    } for s in recent_searches_records]

    # Recent batches
    recent_batches_records = db.query(ImportBatch).order_by(desc(ImportBatch.created_at)).limit(5).all()
    recent_batches = [{
        "id": b.id,
        "original_filename": b.original_filename,
        "total_rows": b.total_rows,
        "valid_rows": b.valid_rows,
        "processed_rows": b.processed_rows,
        "status": "PROCESSING" if batch_manager.is_batch_running(b.id) else b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None
    } for b in recent_batches_records]

    # Contact distribution
    contact_types = db.query(
        CompanyContact.contact_type, 
        func.count(CompanyContact.id)
    ).group_by(CompanyContact.contact_type).all()
    distribution = {ctype: count for ctype, count in contact_types}

    # Department distribution for professionals
    prof_depts = db.query(
        CompanyProfessional.department,
        func.count(CompanyProfessional.id)
    ).group_by(CompanyProfessional.department).all()
    prof_distribution = {dept: count for dept, count in prof_depts}

    return {
        "kpi": {
            "total_companies": total_companies,
            "total_contacts": total_contacts,
            "total_professionals": total_professionals,
            "total_verified_profs": total_verified_profs,
            "active_leads": active_leads,
            "total_searches": total_searches,
            "total_batches": total_batches,
            "active_jobs": active_jobs,
            "failed_jobs": failed_jobs,
        },
        "recent_searches": recent_searches,
        "recent_batches": recent_batches,
        "contact_distribution": distribution,
        "professional_distribution": prof_distribution
    }
