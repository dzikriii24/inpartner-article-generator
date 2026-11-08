from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any

from app.core.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_system_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return non-sensitive system health and configuration status."""
    
    # 1. Check Database connection
    db_status = "DISCONNECTED"
    db_latency_ms = None
    try:
        import time
        t0 = time.time()
        db.execute(text("SELECT 1")).scalar()
        db_latency_ms = round((time.time() - t0) * 1000, 2)
        db_status = "CONNECTED"
    except Exception as e:
        db_status = f"ERROR: {type(e).__name__}"

    # 2. Check AI Provider
    ai_status = "NOT_CONFIGURED"
    ai_model = settings.DEFAULT_GEMINI_MODEL
    if settings.GEMINI_API_KEY:
        ai_status = "ACTIVE"

    # 3. Search Providers
    search_providers = [
        {"name": "Bing Web Search Provider", "status": "ACTIVE", "tier": "Priority 2"},
        {"name": "Wikipedia Structured API", "status": "ACTIVE", "tier": "Priority 1"},
        {"name": "Deep Web Contact Scraper", "status": "ACTIVE", "tier": "Priority 1"},
        {"name": f"Gemini AI Grounded Synthesis ({ai_model})", "status": ai_status, "tier": "Priority 3"},
    ]

    # 4. Lightweight Server Resource Metrics
    resource_info = {}
    try:
        import resource
        import os
        usage = resource.getrusage(resource.RUSAGE_SELF)
        mem_rss_mb = round(usage.ru_maxrss / 1024.0, 2)
        load_avg = os.getloadavg() if hasattr(os, "getloadavg") else (0.0, 0.0, 0.0)
        resource_info = {
            "worker_rss_mb": mem_rss_mb,
            "load_1m": round(load_avg[0], 2),
            "load_5m": round(load_avg[1], 2),
            "load_15m": round(load_avg[2], 2),
            "pid": os.getpid()
        }
    except Exception:
        resource_info = {"worker_rss_mb": None}

    return {
        "database": {
            "status": db_status,
            "engine": "MySQL / PyMySQL",
            "latency_ms": db_latency_ms,
            "pool_pre_ping": True,
            "pool_recycle_sec": 3600
        },
        "resources": resource_info,
        "ai_provider": {
            "provider": "Google Gemini AI",
            "status": ai_status,
            "default_model": settings.DEFAULT_GEMINI_MODEL,
            "fallback_model": settings.FALLBACK_GEMINI_MODEL,
            "api_key_configured": bool(settings.GEMINI_API_KEY)
        },
        "search_providers": search_providers,
        "batch_processing": {
            "default_concurrency": settings.DEFAULT_BATCH_CONCURRENCY,
            "max_retries": settings.DEFAULT_MAX_RETRIES,
            "request_timeout_seconds": settings.REQUEST_TIMEOUT_SECONDS,
            "politeness_delay_seconds": 1.0
        },
        "export_settings": {
            "default_format": "xlsx",
            "sheets_generated": ["Company Overview", "Contact Details"],
            "autofilter": True,
            "freeze_panes": True
        },
        "server": {
            "host": settings.HOST,
            "port": settings.PORT,
            "version": settings.VERSION
        }
    }
