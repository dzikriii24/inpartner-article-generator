import os
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import DailyGeneration, GeneratedArticle
from services.llm_client import get_genai_client, FALLBACK_CHAINS, MODEL_ROLE_CONFIG

DEFAULT_DAILY_LIMIT = int(os.getenv("DAILY_ARTICLE_LIMIT", 5))

def get_or_create_daily_record(db: Session) -> DailyGeneration:
    today_date = date.today()
    record = db.query(DailyGeneration).filter(DailyGeneration.date == today_date).first()
    
    # Calculate actual articles generated today from generated_articles table
    today_start = datetime.combine(today_date, datetime.min.time())
    actual_count = db.query(GeneratedArticle).filter(
        GeneratedArticle.generated_at >= today_start
    ).count()
    
    if not record:
        record = DailyGeneration(
            date=today_date,
            limit=DEFAULT_DAILY_LIMIT,
            generated=actual_count,
            remaining=max(0, DEFAULT_DAILY_LIMIT - actual_count)
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    else:
        # Keep count synced with actual generated_articles if higher
        if actual_count > record.generated:
            record.generated = actual_count
            record.remaining = max(0, record.limit - actual_count)
            db.commit()
            
    return record

def get_usage_and_model_status(db: Session) -> dict:
    record = get_or_create_daily_record(db)
    
    limit = record.limit or DEFAULT_DAILY_LIMIT
    generated = record.generated or 0
    remaining = max(0, limit - generated)
    usage_percent = round(min(100.0, (generated / limit) * 100), 1) if limit > 0 else 100.0
    can_generate = remaining > 0

    # Model status & fallback chain evaluation
    api_key_set = bool(os.getenv("GEMINI_API_KEY"))
    api_health = "Healthy" if api_key_set else "Missing API Key"
    
    models_info = [
        {
            "id": "gemini-3.5-flash-lite",
            "name": "Gemini 3.5 Flash Lite",
            "role": "Primary Research & Extraction",
            "rpd_quota": "500 RPD / 15 RPM",
            "status": "Active" if api_key_set else "Disabled",
            "tier": "High Speed / Efficient"
        },
        {
            "id": "gemini-3.5-flash",
            "name": "Gemini 3.5 Flash",
            "role": "Editorial Composition & Reasoning",
            "rpd_quota": "1,500 RPD / 15 RPM",
            "status": "Active" if api_key_set else "Disabled",
            "tier": "High Intelligence"
        },
        {
            "id": "gemini-3.6-flash",
            "name": "Gemini 3.6 Flash",
            "role": "Fallback Chain Level 1",
            "rpd_quota": "1,500 RPD / 30 RPM",
            "status": "Ready" if api_key_set else "Disabled",
            "tier": "Fast Fallback"
        },
        {
            "id": "gemini-3.1-flash-lite",
            "name": "Gemini 3.1 Flash Lite",
            "role": "Fallback Chain Level 2",
            "rpd_quota": "1,500 RPD / 15 RPM",
            "status": "Ready" if api_key_set else "Disabled",
            "tier": "Standard Fallback"
        }
    ]

    return {
        "status": "success",
        "daily_limit": limit,
        "generated_today": generated,
        "remaining_today": remaining,
        "usage_percent": usage_percent,
        "can_generate": can_generate,
        "api_health": api_health,
        "models": models_info,
        "date": record.date.isoformat()
    }

def record_article_generation(db: Session):
    """
    Increments daily article count when a new generation starts.
    """
    record = get_or_create_daily_record(db)
    record.generated += 1
    record.remaining = max(0, record.limit - record.generated)
    db.commit()
    return record
