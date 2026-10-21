import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schema import Company, ImportBatch, ContactExport
from app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["Exports"])

class ExportRequest(BaseModel):
    batch_id: Optional[int] = None
    company_ids: Optional[List[int]] = None
    export_all: bool = False

@router.post("")
def create_export(payload: ExportRequest, db: Session = Depends(get_db)):
    """Generate Excel file for companies or batch."""
    companies = []
    batch_id = payload.batch_id

    if batch_id:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        comp_ids = [it.company_id for it in batch.items if it.company_id is not None]
        if not comp_ids:
            raise HTTPException(status_code=400, detail="Batch has no enriched companies to export yet")
        companies = db.query(Company).filter(Company.id.in_(comp_ids)).all()
    elif payload.company_ids:
        companies = db.query(Company).filter(Company.id.in_(payload.company_ids)).all()
    elif payload.export_all:
        companies = db.query(Company).all()
    else:
        raise HTTPException(status_code=400, detail="Must specify batch_id, company_ids, or export_all=True")

    if not companies:
        raise HTTPException(status_code=404, detail="No companies found matching export criteria")

    export_record = ExportService.generate_contacts_excel(
        db=db,
        companies=companies,
        batch_id=batch_id
    )

    return {
        "export_id": export_record.id,
        "filename": export_record.filename,
        "total_companies": export_record.total_companies,
        "total_contacts": export_record.total_contacts,
        "download_url": f"/api/exports/{export_record.id}/download"
    }

@router.get("")
def list_exports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ContactExport).order_by(desc(ContactExport.created_at))
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    formatted = []
    for exp in items:
        file_exists = os.path.exists(exp.file_path) if exp.file_path else False
        file_size = os.path.getsize(exp.file_path) if file_exists else 0

        formatted.append({
            "id": exp.id,
            "filename": exp.filename,
            "batch_id": exp.batch_id,
            "export_format": exp.export_format,
            "total_companies": exp.total_companies,
            "total_contacts": exp.total_contacts,
            "file_size": file_size,
            "is_available": file_exists,
            "download_url": f"/api/exports/{exp.id}/download",
            "created_at": exp.created_at.isoformat() if exp.created_at else None
        })

    return {
        "items": formatted,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{export_id}/download")
def download_export_file(export_id: int, db: Session = Depends(get_db)):
    """Serve file download directly."""
    exp = db.query(ContactExport).filter(ContactExport.id == export_id).first()
    if not exp or not os.path.exists(exp.file_path):
        raise HTTPException(status_code=404, detail="Export file not found or expired")

    return FileResponse(
        path=exp.file_path,
        filename=exp.filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
