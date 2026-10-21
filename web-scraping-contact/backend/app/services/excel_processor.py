import os
import openpyxl
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import logging
from sqlalchemy.orm import Session

from app.models.schema import ImportBatch, ImportBatchItem

logger = logging.getLogger(__name__)

COMPANY_COLUMN_KEYWORDS = [
    "nama perusahaan", "company name", "perusahaan", "company",
    "nama pt", "nama klien", "client name", "badan usaha", "nama"
]

class ExcelProcessor:
    @staticmethod
    def inspect_file(file_path: str) -> Dict[str, Any]:
        """Analyze Excel workbook, sheets, and headers."""
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        sheets_info = []

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            
            # Read first 15 rows to detect header and sample data
            rows = []
            for row in ws.iter_rows(values_only=True):
                if any(v is not None for v in row):
                    rows.append([str(v).strip() if v is not None else "" for v in row])
                if len(rows) >= 15:
                    break

            headers = []
            header_row_index = 0
            if rows:
                # Find most plausible header row
                for idx, r in enumerate(rows[:3]):
                    # Check if row looks like headers (string types, short, contains expected keywords)
                    matches = sum(1 for col in r if any(kw in col.lower() for kw in ["no", "nama", "perusahaan", "company", "produk", "status", "email", "kontak", "phone"]))
                    if matches > 0:
                        headers = r
                        header_row_index = idx
                        break
                if not headers and len(rows) > 0:
                    headers = rows[0]

            # Detect company column candidate
            detected_company_col = None
            for col in headers:
                col_lower = col.lower()
                if any(kw in col_lower for kw in COMPANY_COLUMN_KEYWORDS):
                    detected_company_col = col
                    break

            if not detected_company_col and len(headers) > 1:
                # Default to column 2 if column 1 is "No"
                if headers[0].lower() in ["no", "id", "#"]:
                    detected_company_col = headers[1]
                else:
                    detected_company_col = headers[0]
            elif not detected_company_col and len(headers) == 1:
                detected_company_col = headers[0]

            sample_rows = rows[header_row_index + 1 : header_row_index + 11]

            sheets_info.append({
                "sheet_name": sheet_name,
                "headers": headers,
                "detected_company_column": detected_company_col,
                "sample_rows": sample_rows
            })

        wb.close()
        return {
            "file_name": os.path.basename(file_path),
            "file_size": os.path.getsize(file_path),
            "sheets": sheets_info
        }

    @staticmethod
    def get_sheet_preview(file_path: str, sheet_name: str, company_column: str) -> Dict[str, Any]:
        """Detailed analysis of a specific sheet and column."""
        wb = openpyxl.load_workbook(file_path, data_only=True)
        if sheet_name not in wb.sheetnames:
            sheet_name = wb.sheetnames[0]
        ws = wb[sheet_name]

        # Read all rows
        raw_rows = list(ws.iter_rows(values_only=True))
        wb.close()

        if not raw_rows:
            return {
                "total_rows": 0, "valid_rows": 0, "empty_rows": 0,
                "duplicate_rows": 0, "company_column": company_column,
                "preview_rows": [], "all_companies": []
            }

        # Find header index
        header_row = raw_rows[0]
        header_idx = 0
        company_col_idx = 1  # default 2nd col

        for idx, col_val in enumerate(header_row):
            if col_val and str(col_val).strip() == company_column:
                company_col_idx = idx
                break

        total_rows = 0
        empty_rows = 0
        duplicate_rows = 0
        valid_companies = []
        seen = set()
        preview_data = []

        for row_num, row in enumerate(raw_rows[1:], start=2):
            total_rows += 1
            if company_col_idx >= len(row):
                empty_rows += 1
                continue
            
            val = row[company_col_idx]
            if val is None or str(val).strip() == "":
                empty_rows += 1
                continue

            comp_str = str(val).strip()
            norm = comp_str.lower()
            if norm in seen:
                duplicate_rows += 1
            else:
                seen.add(norm)
                valid_companies.append({
                    "row_number": row_num,
                    "company_name": comp_str,
                    "metadata": {str(header_row[i]): str(row[i]) for i in range(len(row)) if i < len(header_row) and row[i] is not None}
                })

            if len(preview_data) < 10:
                row_dict = {}
                for c_idx, cell in enumerate(row):
                    h_name = str(header_row[c_idx]) if c_idx < len(header_row) and header_row[c_idx] is not None else f"Column {c_idx+1}"
                    row_dict[h_name] = str(cell) if cell is not None else ""
                preview_data.append(row_dict)

        return {
            "total_rows": total_rows,
            "valid_rows": len(valid_companies),
            "empty_rows": empty_rows,
            "duplicate_rows": duplicate_rows,
            "company_column": company_column,
            "preview_rows": preview_data,
            "valid_companies": valid_companies
        }

    @staticmethod
    def create_batch_record(
        db: Session,
        file_path: str,
        original_filename: str,
        sheet_name: str,
        company_column: str
    ) -> ImportBatch:
        """Create ImportBatch and ImportBatchItem records in database."""
        analysis = ExcelProcessor.get_sheet_preview(file_path, sheet_name, company_column)
        
        batch = ImportBatch(
            original_filename=original_filename,
            stored_filename=os.path.basename(file_path),
            file_size_bytes=os.path.getsize(file_path),
            selected_sheet=sheet_name,
            selected_company_column=company_column,
            total_rows=analysis["total_rows"],
            valid_rows=analysis["valid_rows"],
            empty_rows=analysis["empty_rows"],
            duplicate_rows=analysis["duplicate_rows"],
            status="PENDING",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(batch)
        db.flush()

        # Create batch items
        for item in analysis["valid_companies"]:
            batch_item = ImportBatchItem(
                batch_id=batch.id,
                row_number=item["row_number"],
                input_company_name=item["company_name"],
                extra_metadata=json.dumps(item["metadata"]),
                status="PENDING",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(batch_item)

        db.commit()
        db.refresh(batch)
        return batch
