from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    input_name = Column(String(255), nullable=False, index=True)
    official_name = Column(String(255), nullable=True)
    normalized_name = Column(String(255), nullable=False, index=True)
    website = Column(String(255), nullable=True)
    domain = Column(String(255), nullable=True, index=True)
    industry = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    country = Column(String(100), default="Indonesia")
    province = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    postal_code = Column(String(20), nullable=True)
    matching_confidence = Column(Float, default=0.0)
    data_quality_notes = Column(Text, nullable=True)
    search_status = Column(String(50), default="COMPLETED")
    audit_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contacts = relationship("CompanyContact", back_populates="company", cascade="all, delete-orphan", lazy="joined")
    batch_items = relationship("ImportBatchItem", back_populates="company")

    __table_args__ = (
        Index("idx_company_normalized", "normalized_name"),
        Index("idx_company_domain", "domain"),
    )

class CompanyContact(Base):
    __tablename__ = "company_contacts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_type = Column(String(100), nullable=False, default="general_email")  
    # types: general_email, sales_email, bizdev_email, office_phone, cs_phone, whatsapp, linkedin, instagram, facebook, youtube, address, contact_person, website, career_page, etc.
    contact_person_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(100), nullable=True, index=True)
    address = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    source_url = Column(Text, nullable=True)
    source_domain = Column(String(255), nullable=True)
    source_page_title = Column(String(255), nullable=True)
    source_section = Column(String(100), nullable=True)  # footer, contact_page, about_page, json_ld_schema, homepage
    evidence_text = Column(Text, nullable=True)  # surrounding sentence or context
    extraction_method = Column(String(100), default="http_html")  # http_html, json_ld_structured, browser_automation, wikipedia_infobox
    source_type = Column(String(100), default="official_website")  # official_website, wikipedia, search_engine, public_directory, ai_research
    verification_status = Column(String(50), default="unverified")  # verified_official_website, found_on_public_source, format_valid, needs_review, not_found, website_unreachable, conflicting
    confidence_score = Column(Float, default=0.5)
    raw_value = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    last_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="contacts")

class SearchHistory(Base):
    __tablename__ = "search_histories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query = Column(String(255), nullable=False, index=True)
    search_type = Column(String(50), default="manual")  # manual, batch_single
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED
    results_summary = Column(Text, nullable=True)  # JSON summary
    contacts_found_count = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company")

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    selected_sheet = Column(String(100), default="Sheet1")
    selected_company_column = Column(String(100), default="Nama Perusahaan")
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    empty_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    partial_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    status = Column(String(50), default="PENDING")  # PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED, CANCELLED
    processing_statistics = Column(Text, nullable=True)  # JSON
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("ImportBatchItem", back_populates="batch", cascade="all, delete-orphan")

class ImportBatchItem(Base):
    __tablename__ = "import_batch_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    input_company_name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=True)
    extra_metadata = Column(Text, nullable=True)  # JSON string of remaining columns
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED
    error_summary = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)  # JSON summary of extracted contacts
    retry_count = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    batch = relationship("ImportBatch", back_populates="items")
    company = relationship("Company", back_populates="batch_items")

class ContactExport(Base):
    __tablename__ = "contact_exports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True)
    search_history_id = Column(Integer, ForeignKey("search_histories.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    export_format = Column(String(20), default="xlsx")
    export_parameters = Column(Text, nullable=True)  # JSON
    total_companies = Column(Integer, default=0)
    total_contacts = Column(Integer, default=0)
    status = Column(String(50), default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
