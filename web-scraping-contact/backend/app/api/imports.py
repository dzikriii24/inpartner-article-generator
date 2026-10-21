import os
import shutil
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.models.schema import ImportBatch, ImportBatchItem
from app.services.excel_processor import ExcelProcessor
from app.workers.batch_worker import batch_manager

router = APIRouter(prefix="/imports", tags=["Imports"])

class PreviewRequest(BaseModel):
    file_path: str
    sheet_name: str
    company_column: str

class CreateBatchRequest(BaseModel):
    file_path: str
    original_filename: str
    sheet_name: str
    company_column: str

@router.post("/upload")
async def upload_excel_file(file: UploadFile = File(...)):
    """Upload Excel file and inspect its sheets and headers."""
    filename = file.filename or "uploaded.xlsx"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls"]:
        raise HTTPException(status_code=400, detail="Only .xlsx and .xls files are supported")

    unique_name = f"{uuid.uuid4().hex[:10]}_{filename}"
    save_path = str(settings.UPLOAD_DIR / unique_name)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        inspection = ExcelProcessor.inspect_file(save_path)
        inspection["file_path"] = save_path
        inspection["stored_filename"] = unique_name
        return inspection
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

@router.post("/preview")
def preview_sheet_data(payload: PreviewRequest):
    """Preview rows and column stats for a given sheet and column."""
    if not os.path.exists(payload.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found on server")

    preview = ExcelProcessor.get_sheet_preview(
        payload.file_path,
        payload.sheet_name,
        payload.company_column
    )
    return preview

@router.post("")
def create_batch(payload: CreateBatchRequest, db: Session = Depends(get_db)):
    """Create batch and batch items in database."""
    if not os.path.exists(payload.file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found on server")

    batch = ExcelProcessor.create_batch_record(
        db=db,
        file_path=payload.file_path,
        original_filename=payload.original_filename,
        sheet_name=payload.sheet_name,
        company_column=payload.company_column
    )

    return {
        "batch_id": batch.id,
        "original_filename": batch.original_filename,
        "total_rows": batch.total_rows,
        "valid_rows": batch.valid_rows,
        "status": batch.status
    }

@router.get("")
def list_import_batches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ImportBatch).order_by(desc(ImportBatch.created_at))
    total = query.count()
    batches = query.offset((page - 1) * limit).limit(limit).all()

    items = []
    for b in batches:
        is_running = batch_manager.is_batch_running(b.id)
        current_status = "PROCESSING" if is_running else b.status
        progress_pct = int(((b.processed_rows or 0) / b.valid_rows * 100)) if b.valid_rows > 0 else 0

        items.append({
            "id": b.id,
            "original_filename": b.original_filename,
            "selected_sheet": b.selected_sheet,
            "selected_company_column": b.selected_company_column,
            "total_rows": b.total_rows,
            "valid_rows": b.valid_rows,
            "processed_rows": b.processed_rows,
            "success_rows": b.success_rows,
            "partial_rows": b.partial_rows,
            "failed_rows": b.failed_rows,
            "status": current_status,
            "progress_percent": min(100, progress_pct),
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "completed_at": b.completed_at.isoformat() if b.completed_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{batch_id}")
def get_batch_detail(
    batch_id: int,
    item_page: int = Query(1, ge=1),
    item_limit: int = Query(30, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    items_query = db.query(ImportBatchItem).filter(ImportBatchItem.batch_id == batch_id)
    if status_filter:
        items_query = items_query.filter(ImportBatchItem.status == status_filter)

    total_items = items_query.count()
    items = items_query.order_by(ImportBatchItem.row_number.asc())\
        .offset((item_page - 1) * item_limit).limit(item_limit).all()

    formatted_items = []
    for it in items:
        company_info = None
        if it.company:
            company_info = {
                "id": it.company.id,
                "official_name": it.company.official_name,
                "website": it.company.website,
                "city": it.company.city,
                "total_contacts": len(it.company.contacts)
            }

        formatted_items.append({
            "id": it.id,
            "row_number": it.row_number,
            "input_company_name": it.input_company_name,
            "status": it.status,
            "error_summary": it.error_summary,
            "retry_count": it.retry_count,
            "company": company_info,
            "completed_at": it.completed_at.isoformat() if it.completed_at else None
        })

    progress_pct = int(((batch.processed_rows or 0) / batch.valid_rows * 100)) if batch.valid_rows > 0 else 0

    return {
        "id": batch.id,
        "original_filename": batch.original_filename,
        "selected_sheet": batch.selected_sheet,
        "selected_company_column": batch.selected_company_column,
        "total_rows": batch.total_rows,
        "valid_rows": batch.valid_rows,
        "empty_rows": batch.empty_rows,
        "duplicate_rows": batch.duplicate_rows,
        "processed_rows": batch.processed_rows,
        "success_rows": batch.success_rows,
        "partial_rows": batch.partial_rows,
        "failed_rows": batch.failed_rows,
        "status": "PROCESSING" if batch_manager.is_batch_running(batch.id) else batch.status,
        "progress_percent": min(100, progress_pct),
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "started_at": batch.started_at.isoformat() if batch.started_at else None,
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None,
        "items": formatted_items,
        "items_total": total_items,
        "items_page": item_page,
        "items_limit": item_limit
    }

@router.post("/{batch_id}/process")
def start_batch_processing(batch_id: int, db: Session = Depends(get_db)):
    """Start asynchronous background enrichment for the batch."""
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch_manager.is_batch_running(batch_id):
        return {"message": "Batch is already running", "status": "PROCESSING"}

    success = batch_manager.start_batch_processing(batch_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not start batch")

    return {"message": "Batch processing started", "status": "PROCESSING"}

@router.post("/{batch_id}/cancel")
def cancel_batch_processing(batch_id: int, db: Session = Depends(get_db)):
    """Cancel currently running batch processing."""
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch_manager.cancel_batch(batch_id)
    batch.status = "CANCELLED"
    db.commit()
    return {"message": "Batch processing cancelled", "status": "CANCELLED"}

@router.post("/{batch_id}/retry-failed")
def retry_failed_items(batch_id: int, db: Session = Depends(get_db)):
    """Reset failed items to PENDING and restart batch processing."""
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch_manager.is_batch_running(batch_id):
        raise HTTPException(status_code=400, detail="Batch is currently running. Cancel it first before retrying.")

    failed_items = db.query(ImportBatchItem).filter(
        ImportBatchItem.batch_id == batch_id,
        ImportBatchItem.status == "FAILED"
    ).all()

    if not failed_items:
        return {"message": "No failed items found to retry", "retried_count": 0}

    for it in failed_items:
        it.status = "PENDING"
        it.error_summary = None

    batch.status = "PENDING"
    batch.failed_rows = 0
    db.commit()

    batch_manager.start_batch_processing(batch_id)
    return {"message": f"Retrying {len(failed_items)} failed items", "retried_count": len(failed_items)}
