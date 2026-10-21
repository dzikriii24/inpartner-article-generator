import time
import threading
import logging
from datetime import datetime
from typing import Dict, Set, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.schema import ImportBatch, ImportBatchItem, Company
from app.services.search_engine import CompanySearchEngine
from app.services.export_service import ExportService

logger = logging.getLogger(__name__)

class BatchWorkerManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(BatchWorkerManager, cls).__new__(cls)
                cls._instance.active_batches: Set[int] = set()
                cls._instance.cancelled_batches: Set[int] = set()
                cls._instance.search_engine = CompanySearchEngine()
        return cls._instance

    def is_batch_running(self, batch_id: int) -> bool:
        return batch_id in self.active_batches

    def cancel_batch(self, batch_id: int):
        self.cancelled_batches.add(batch_id)

    def start_batch_processing(self, batch_id: int):
        """Spawns background thread for processing batch."""
        if batch_id in self.active_batches:
            logger.warning(f"Batch {batch_id} is already running!")
            return False

        self.active_batches.add(batch_id)
        if batch_id in self.cancelled_batches:
            self.cancelled_batches.remove(batch_id)

        thread = threading.Thread(
            target=self._process_batch_thread,
            args=(batch_id,),
            daemon=True,
            name=f"BatchProcessor-{batch_id}"
        )
        thread.start()
        return True

    def _process_batch_thread(self, batch_id: int):
        db: Session = SessionLocal()
        try:
            batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
            if not batch:
                logger.error(f"Batch {batch_id} not found in worker thread!")
                return

            batch.status = "PROCESSING"
            batch.started_at = datetime.utcnow()
            db.commit()

            # Fetch pending or retryable items
            items = db.query(ImportBatchItem).filter(
                ImportBatchItem.batch_id == batch_id,
                ImportBatchItem.status.in_(["PENDING", "FAILED"])
            ).order_by(ImportBatchItem.row_number.asc()).all()

            logger.info(f"Batch {batch_id}: processing {len(items)} items")

            for item in items:
                # Check for cancellation signal
                if batch_id in self.cancelled_batches:
                    logger.info(f"Batch {batch_id} was cancelled by user.")
                    batch.status = "CANCELLED"
                    db.commit()
                    break

                item.status = "PROCESSING"
                item.started_at = datetime.utcnow()
                db.commit()

                try:
                    result = self.search_engine.search_and_enrich(
                        company_name=item.input_company_name,
                        db=db,
                        search_type="batch_single"
                    )

                    item.status = result.get("status", "COMPLETED")
                    item.company_id = result.get("company_id")
                    item.completed_at = datetime.utcnow()

                    if item.status == "COMPLETED":
                        batch.success_rows = (batch.success_rows or 0) + 1
                    elif item.status == "PARTIAL":
                        batch.partial_rows = (batch.partial_rows or 0) + 1
                    else:
                        batch.failed_rows = (batch.failed_rows or 0) + 1

                except Exception as e:
                    logger.error(f"Error enriching item {item.id} ('{item.input_company_name}'): {e}")
                    item.status = "FAILED"
                    item.error_summary = str(e)[:255]
                    item.retry_count = (item.retry_count or 0) + 1
                    item.completed_at = datetime.utcnow()

                # Dynamic accurate recounts from items to prevent any counter drift on pause/resume
                batch.success_rows = db.query(ImportBatchItem).filter(
                    ImportBatchItem.batch_id == batch_id, ImportBatchItem.status == "COMPLETED"
                ).count()
                batch.partial_rows = db.query(ImportBatchItem).filter(
                    ImportBatchItem.batch_id == batch_id, ImportBatchItem.status == "PARTIAL"
                ).count()
                batch.failed_rows = db.query(ImportBatchItem).filter(
                    ImportBatchItem.batch_id == batch_id, ImportBatchItem.status.in_(["FAILED", "NOT_FOUND", "WEBSITE_UNREACHABLE"])
                ).count()
                batch.processed_rows = batch.success_rows + batch.partial_rows + batch.failed_rows
                batch.updated_at = datetime.utcnow()
                db.commit()

                # Politeness delay between company searches
                time.sleep(1.0)

            # Determine final batch status
            if batch.status != "CANCELLED":
                if batch.failed_rows == batch.valid_rows and batch.valid_rows > 0:
                    batch.status = "FAILED"
                elif (batch.failed_rows or 0) > 0:
                    batch.status = "PARTIAL"
                else:
                    batch.status = "COMPLETED"

                batch.completed_at = datetime.utcnow()
                db.commit()

                # Auto-generate export file for quick download
                try:
                    company_ids = [
                        it.company_id for it in batch.items if it.company_id is not None
                    ]
                    if company_ids:
                        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
                        ExportService.generate_contacts_excel(
                            db=db,
                            companies=companies,
                            batch_id=batch.id,
                            custom_filename=f"batch-{batch.id}-{batch.original_filename.replace('.xlsx', '')}-contacts.xlsx"
                        )
                except Exception as exp_err:
                    logger.warning(f"Could not auto-generate batch export: {exp_err}")

        except Exception as e:
            logger.error(f"Fatal batch processing error for batch {batch_id}: {e}")
            if batch:
                batch.status = "FAILED"
                db.commit()
        finally:
            if batch_id in self.active_batches:
                self.active_batches.remove(batch_id)
            if batch_id in self.cancelled_batches:
                self.cancelled_batches.remove(batch_id)
            db.close()

batch_manager = BatchWorkerManager()
