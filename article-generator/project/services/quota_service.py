import os
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import DailyGeneration, GeneratedArticle
from services.llm_client import get_genai_client, FALLBACK_CHAINS, MODEL_ROLE_CONFIG

DEFAULT_DAILY_LIMIT = "Unlimited"

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
            limit=999999,
            generated=actual_count,
            remaining=999999
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    else:
        # Keep count synced with actual generated_articles if higher
        if actual_count > record.generated:
            record.generated = actual_count
            db.commit()
            
    return record

def get_usage_and_model_status(db: Session) -> dict:
    record = get_or_create_daily_record(db)
    
    generated = record.generated or 0
    remaining = "Unlimited"
    can_generate = True
    usage_percent = 100.0

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

    now = datetime.now()
    tomorrow = now.date() + timedelta(days=1)
    reset_time = datetime.combine(tomorrow, datetime.min.time())
    time_until_reset = reset_time - now
    
    hours, remainder = divmod(time_until_reset.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    reset_in = f"{hours}h {minutes}m"

    return {
        "status": "success",
        "daily_limit": "Unlimited",
        "generated_today": generated,
        "remaining_today": "Unlimited",
        "usage_percent": usage_percent,
        "can_generate": can_generate,
        "api_health": api_health,
        "models": models_info,
        "date": record.date.isoformat(),
        "current_time": now.strftime("%Y-%m-%d %H:%M"),
        "reset_in": reset_in
    }

def record_article_generation(db: Session):
    """
    Increments daily article count when a new generation starts.
    """
    record = get_or_create_daily_record(db)
    record.generated += 1
    db.commit()
    return record
