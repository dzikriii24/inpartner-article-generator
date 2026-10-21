from fastapi import APIRouter, Request, Depends, HTTPException, status, Form, Query, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
import os

from database import SessionLocal, engine
from models import (
    AdminUser,
    AutomationSetting,
    AutomationExecution,
    AutomationExecutionItem,
    ArticleTopic,
    GeneratedArticle,
    ArticleAudit,
    ArticleRevision,
    WordPressSyncLog
)
from services.seo_engine import run_article_audit, analyze_readability, analyze_seo
from services.optimizer_service import (
    optimize_article_and_create_revision,
    accept_article_revision,
    reject_article_revision
)
from services.wordpress_service import (
    preview_wordpress_sync,
    re_sync_article_to_wordpress,
    publish_to_wordpress
)

from services.auth_service import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
    get_current_admin,
    SESSION_COOKIE_NAME,
    SESSION_DURATION_DAYS
)
from services.topic_service import (
    get_all_topics,
    get_topics_grouped,
    add_topic,
    delete_topic
)
from services.scheduler_service import (
    get_or_create_automation_settings,
    get_scheduler_status,
    reschedule_job,
    run_now_async
)
from services.analytics_service import (
    get_analytics_overview,
    sync_wordpress_posts,
    sync_ga4_data,
    record_tracking_event,
    get_all_articles_with_stats
)
from services.wordpress_service import test_wordpress_connection, clean_wp_url

admin_router = APIRouter()

current_dir = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(current_dir, "templates"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    admin = get_current_admin(request, db)
    if not admin:
        # If API request (JSON) -> 401
        accept = request.headers.get("accept", "")
        if "application/json" in accept or "/api/" in request.url.path:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please log in as admin."
            )
        # If page request -> Redirect to login
        base_prefix = "/inpartner" if "/inpartner" in request.url.path else ""
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": f"{base_prefix}/admin/login"}
        )
    return admin


# ---------------------------------------------------------------------------
# Pydantic Request Models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str

class AutomationSettingsUpdateRequest(BaseModel):
    is_enabled: bool = True
    schedule_hour: int = Field(ge=0, le=23, default=8)
    schedule_minute: int = Field(ge=0, le=59, default=0)
    timezone: str = "Asia/Jakarta"
    articles_per_day: int = Field(ge=1, le=10, default=5)
    selected_topics: List[str] = []
    topic_strategy: str = "round_robin"
    language: str = "English"
    target_audience: str = "Decision Makers"
    writing_style: str = "Analytical & Executive"
    article_length: str = "Medium (~1200 words)"
    direct_publish_wp: bool = False
    wp_url: Optional[str] = None
    wp_username: Optional[str] = None
    wp_app_password: Optional[str] = None
    wp_category_id: Optional[int] = None
    wp_author_id: Optional[int] = None
    ga4_property_id: Optional[str] = None
    ga4_credentials_json: Optional[str] = None

class AddTopicRequest(BaseModel):
    name: str
    category: str = "Custom"

class TrackingEventRequest(BaseModel):
    article_id: Optional[int] = None
    wordpress_post_id: Optional[int] = None
    article_title: Optional[str] = None
    event_type: str = "view"
    reading_seconds: int = 0
    session_id: Optional[str] = None
    referrer: Optional[str] = None

class BulkAuditRequest(BaseModel):
    article_ids: Optional[List[int]] = None
    all_unassessed: bool = False

class OptimizeArticleRequest(BaseModel):
    auto_accept: bool = False

class BulkOptimizeRequest(BaseModel):
    article_ids: List[int]
    auto_accept: bool = False

class ReSyncRequest(BaseModel):
    status: Optional[str] = None



# ---------------------------------------------------------------------------
# Authentication & Page Routes
# ---------------------------------------------------------------------------

@admin_router.get("/admin/login")
def get_login_page(request: Request, db: Session = Depends(get_db)):
    # If already logged in, redirect to admin dashboard
    admin = get_current_admin(request, db)
    base_prefix = "/inpartner" if "/inpartner" in request.url.path else ""
    if admin:
        return RedirectResponse(url=f"{base_prefix}/admin", status_code=303)
        
    return templates.TemplateResponse(
        "admin.html",
        context={
            "request": request,
            "view_mode": "login",
            "base_prefix": base_prefix
        }
    )


@admin_router.post("/api/admin/login")
def api_admin_login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    username = req.username.strip()
    password = req.password.strip()

    admin = db.query(AdminUser).filter(AdminUser.username == username, AdminUser.is_active == True).first()
    if not admin or not verify_password(password, admin.password_hash):
        return JSONResponse(
            {"status": "error", "message": "Invalid username or password."},
            status_code=401
        )

    # Update last login
    admin.last_login_at = datetime.utcnow()
    db.commit()

    # Create signed session token
    token = create_session_token(admin.id, admin.username)
    max_age = SESSION_DURATION_DAYS * 86400

    resp = JSONResponse({
        "status": "success",
        "message": f"Welcome back, {admin.username}!",
        "admin": {
            "id": admin.id,
            "username": admin.username,
            "role": admin.role
        }
    })

    # Set secure HTTP-only cookie
    resp.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False # Set to True in production with HTTPS
    )
    return resp


@admin_router.post("/api/admin/logout")
@admin_router.get("/admin/logout")
def api_admin_logout(request: Request):
    base_prefix = "/inpartner" if "/inpartner" in request.url.path else ""
    resp = RedirectResponse(url=f"{base_prefix}/admin/login", status_code=303)
    resp.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return resp


@admin_router.get("/admin")
def get_admin_dashboard(request: Request, db: Session = Depends(get_db)):
    admin = get_current_admin(request, db)
    base_prefix = "/inpartner" if "/inpartner" in request.url.path else ""
    if not admin:
        return RedirectResponse(url=f"{base_prefix}/admin/login", status_code=303)

    return templates.TemplateResponse(
        "admin.html",
        context={
            "request": request,
            "view_mode": "dashboard",
            "admin": admin,
            "base_prefix": base_prefix
        }
    )


# ---------------------------------------------------------------------------
# Admin API: Overview & Summary Stats
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/overview")
def get_admin_overview(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    scheduler_info = get_scheduler_status()
    setting = get_or_create_automation_settings(db)

    # Database connectivity test
    db_status = "Disconnected"
    db_version = "Unknown"
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT VERSION()")).scalar()
            db_status = "Connected"
            db_version = str(res)
    except Exception as e:
        db_status = f"Error: {str(e)[:40]}"

    # WordPress connectivity test
    wp_status = "Not Configured"
    wp_site = None
    if setting.wp_url and setting.wp_username and setting.wp_app_password:
        wp_test = test_wordpress_connection(setting.wp_url, setting.wp_username, setting.wp_app_password)
        if wp_test.get("success"):
            wp_status = "Connected"
            wp_site = clean_wp_url(setting.wp_url)
        else:
            wp_status = f"Auth Failed"

    return {
        "status": "success",
        "admin": {
            "username": admin.username,
            "role": admin.role
        },
        "automation": scheduler_info,
        "database": {
            "status": db_status,
            "version": db_version
        },
        "wordpress": {
            "status": wp_status,
            "site_url": wp_site
        }
    }


# ---------------------------------------------------------------------------
# Admin API: Settings & Scheduler Management
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/settings")
def get_admin_settings(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    setting = get_or_create_automation_settings(db)
    scheduler_info = get_scheduler_status()

    # Do not leak the plain app password in frontend, send masked indicator
    has_wp_pwd = bool(setting.wp_app_password)
    has_ga4_creds = bool(setting.ga4_credentials_json)

    return {
        "status": "success",
        "settings": {
            "is_enabled": setting.is_enabled,
            "schedule_hour": setting.schedule_hour,
            "schedule_minute": setting.schedule_minute,
            "timezone": setting.timezone,
            "articles_per_day": setting.articles_per_day,
            "selected_topics": setting.selected_topics or [],
            "topic_strategy": setting.topic_strategy,
            "language": setting.language,
            "target_audience": setting.target_audience,
            "writing_style": setting.writing_style,
            "article_length": setting.article_length,
            "direct_publish_wp": setting.direct_publish_wp,
            "wp_url": setting.wp_url or "",
            "wp_username": setting.wp_username or "",
            "has_wp_app_password": has_wp_pwd,
            "wp_category_id": setting.wp_category_id,
            "wp_author_id": setting.wp_author_id,
            "ga4_property_id": setting.ga4_property_id or "",
            "has_ga4_credentials": has_ga4_creds,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
        },
        "scheduler": scheduler_info
    }


@admin_router.post("/api/admin/settings")
def update_admin_settings(
    req: AutomationSettingsUpdateRequest,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    setting = get_or_create_automation_settings(db)

    setting.is_enabled = req.is_enabled
    setting.schedule_hour = req.schedule_hour
    setting.schedule_minute = req.schedule_minute
    setting.timezone = req.timezone.strip() or "Asia/Jakarta"
    setting.articles_per_day = max(1, min(10, req.articles_per_day))
    setting.selected_topics = req.selected_topics
    setting.topic_strategy = req.topic_strategy
    setting.language = req.language
    setting.target_audience = req.target_audience
    setting.writing_style = req.writing_style
    setting.article_length = req.article_length
    setting.direct_publish_wp = req.direct_publish_wp

    if req.wp_url is not None:
        setting.wp_url = clean_wp_url(req.wp_url) if req.wp_url.strip() else None
    if req.wp_username is not None:
        setting.wp_username = req.wp_username.strip() or None
    # Only update password if a new non-empty string is provided
    if req.wp_app_password and req.wp_app_password.strip() and not req.wp_app_password.strip().startswith("***"):
        setting.wp_app_password = req.wp_app_password.strip()
    if req.wp_category_id is not None:
        setting.wp_category_id = req.wp_category_id
    if req.wp_author_id is not None:
        setting.wp_author_id = req.wp_author_id

    if req.ga4_property_id is not None:
        setting.ga4_property_id = req.ga4_property_id.strip() or None
    if req.ga4_credentials_json and req.ga4_credentials_json.strip() and not req.ga4_credentials_json.strip().startswith("***"):
        setting.ga4_credentials_json = req.ga4_credentials_json.strip()

    setting.updated_at = datetime.utcnow()
    db.commit()

    # Re-apply schedule to active APScheduler job
    reschedule_job()

    return {
        "status": "success",
        "message": "Automation configuration saved successfully.",
        "scheduler": get_scheduler_status()
    }


@admin_router.post("/api/admin/automation/toggle")
def toggle_automation(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    setting = get_or_create_automation_settings(db)
    setting.is_enabled = not setting.is_enabled
    setting.updated_at = datetime.utcnow()
    db.commit()

    reschedule_job()

    state_str = "ACTIVE" if setting.is_enabled else "PAUSED"
    return {
        "status": "success",
        "is_enabled": setting.is_enabled,
        "message": f"Daily automation is now {state_str}.",
        "scheduler": get_scheduler_status()
    }


@admin_router.post("/api/admin/automation/run-now")
def run_automation_now(admin: AdminUser = Depends(require_admin)):
    result = run_now_async()
    return result


@admin_router.get("/api/admin/automation/running-status")
def get_running_status(admin: AdminUser = Depends(require_admin)):
    status_info = get_scheduler_status()
    return {
        "is_running": status_info["is_running"],
        "status": status_info["status"],
        "current_running_id": status_info["current_running_id"],
        "last_status": status_info["last_status"],
        "last_run": status_info["last_run"],
        "today_success": status_info["today_success"],
        "today_failed": status_info["today_failed"]
    }


# ---------------------------------------------------------------------------
# Admin API: Topic Management
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/topics")
def get_topics_api(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    grouped = get_topics_grouped(db, active_only=True)
    all_list = get_all_topics(db, active_only=True)
    setting = get_or_create_automation_settings(db)

    return {
        "status": "success",
        "grouped": grouped,
        "topics": [{"id": t.id, "name": t.name, "category": t.category, "is_preset": t.is_preset} for t in all_list],
        "selected_topics": setting.selected_topics or []
    }


@admin_router.post("/api/admin/topics")
def add_topic_api(req: AddTopicRequest, admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        new_topic = add_topic(db, name=req.name, category=req.category, is_preset=False)
        return {
            "status": "success",
            "message": f"Topic '{new_topic.name}' added successfully.",
            "topic": {
                "id": new_topic.id,
                "name": new_topic.name,
                "category": new_topic.category,
                "is_preset": new_topic.is_preset
            }
        }
    except ValueError as ve:
        return JSONResponse({"status": "error", "message": str(ve)}, status_code=400)


@admin_router.delete("/api/admin/topics/{topic_id}")
def delete_topic_api(topic_id: int, admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    ok = delete_topic(db, topic_id)
    if not ok:
        return JSONResponse({"status": "error", "message": "Topic not found."}, status_code=404)
    return {"status": "success", "message": "Topic removed successfully."}


# ---------------------------------------------------------------------------
# Admin API: Automation Execution History
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/executions")
def get_executions_api(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    status: Optional[str] = None,
    date_filter: Optional[str] = None,
    q: Optional[str] = None,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AutomationExecution)

    if status and status.upper() != "ALL":
        query = query.filter(AutomationExecution.status == status.upper())

    if date_filter:
        try:
            filter_date = date.fromisoformat(date_filter)
            d_start = datetime.combine(filter_date, datetime.min.time())
            d_end = datetime.combine(filter_date, datetime.max.time())
            query = query.filter(AutomationExecution.started_at >= d_start, AutomationExecution.started_at <= d_end)
        except Exception:
            pass

    if q and q.strip():
        term = f"%{q.strip()}%"
        # Search by ID or summary notes
        if q.strip().isdigit():
            query = query.filter(AutomationExecution.id == int(q.strip()))
        else:
            query = query.filter(AutomationExecution.summary_notes.ilike(term))

    total = query.count()
    executions = query.order_by(AutomationExecution.started_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for ex in executions:
        items.append({
            "id": ex.id,
            "trigger_type": ex.trigger_type,
            "status": ex.status,
            "topics": ex.topics_processed or [],
            "articles_requested": ex.articles_requested,
            "articles_succeeded": ex.articles_succeeded,
            "articles_failed": ex.articles_failed,
            "started_at": ex.started_at.strftime("%Y-%m-%d %H:%M:%S") if ex.started_at else None,
            "completed_at": ex.completed_at.strftime("%Y-%m-%d %H:%M:%S") if ex.completed_at else None,
            "duration_seconds": ex.duration_seconds or 0.0,
            "error_message": ex.error_message,
            "summary_notes": ex.summary_notes
        })

    return {
        "status": "success",
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "executions": items
    }


@admin_router.get("/api/admin/executions/{execution_id}")
def get_execution_detail_api(
    execution_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    execution = db.query(AutomationExecution).filter(AutomationExecution.id == execution_id).first()
    if not execution:
        return JSONResponse({"status": "error", "message": "Execution record not found."}, status_code=404)

    items = []
    for it in execution.items:
        art = it.article
        items.append({
            "id": it.id,
            "topic_title": it.topic_title,
            "category": it.category,
            "status": it.status,
            "duration_seconds": it.duration_seconds,
            "error_message": it.error_message,
            "article": {
                "id": art.id if art else None,
                "title": art.title if art else None,
                "status": art.status.value if art and hasattr(art.status, "value") else str(art.status) if art else None,
                "wordpress_post_id": art.wordpress_post_id if art else None,
                "wordpress_status": art.wordpress_status if art else None,
                "article_url": f"/inpartner/article/{art.id}" if art else None
            } if art else None
        })

    return {
        "status": "success",
        "execution": {
            "id": execution.id,
            "trigger_type": execution.trigger_type,
            "status": execution.status,
            "started_at": execution.started_at.strftime("%Y-%m-%d %H:%M:%S") if execution.started_at else None,
            "completed_at": execution.completed_at.strftime("%Y-%m-%d %H:%M:%S") if execution.completed_at else None,
            "duration_seconds": execution.duration_seconds,
            "articles_requested": execution.articles_requested,
            "articles_succeeded": execution.articles_succeeded,
            "articles_failed": execution.articles_failed,
            "error_message": execution.error_message,
            "summary_notes": execution.summary_notes,
            "items": items
        }
    }


# ---------------------------------------------------------------------------
# Admin API: WordPress & Analytics Integration
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/analytics")
def get_analytics_api(
    period: str = "7d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    days = 7
    c_start = None
    c_end = None

    if period == "today":
        days = 1
    elif period == "7d":
        days = 7
    elif period == "30d":
        days = 30
    elif period == "month":
        today = date.today()
        c_start = today.replace(day=1)
        c_end = today
    elif period == "custom" and start_date and end_date:
        try:
            c_start = date.fromisoformat(start_date)
            c_end = date.fromisoformat(end_date)
        except Exception:
            days = 7

    overview = get_analytics_overview(db, period_days=days, custom_start=c_start, custom_end=c_end)
    return overview


@admin_router.post("/api/admin/analytics/sync-wordpress")
def sync_wp_api(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    res = sync_wordpress_posts(db)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
    return {"status": "success", "message": f"Successfully synced {res.get('synced_count')} articles from WordPress."}


@admin_router.post("/api/admin/analytics/sync-ga4")
def sync_ga4_api(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    res = sync_ga4_data(db)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("message") or res.get("error")}, status_code=400)
    return {"status": "success", "message": res.get("message")}


@admin_router.post("/api/admin/wordpress/test")
def test_wp_api(req: dict, admin: AdminUser = Depends(require_admin)):
    wp_url = req.get("wp_url", "")
    username = req.get("username", "")
    password = req.get("app_password", "")

    if not wp_url or not username or not password:
        return JSONResponse({"status": "error", "message": "WordPress URL, Username, and Application Password are required."}, status_code=400)

    res = test_wordpress_connection(wp_url, username, password)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error", "Connection failed")}, status_code=400)

    return {
        "status": "success",
        "message": f"Connection verified successfully as '{res.get('name')}'."
    }


# ---------------------------------------------------------------------------
# Public Tracking Endpoint (Used by blog readers or WordPress embeds)
# ---------------------------------------------------------------------------

@admin_router.post("/api/analytics/track")
def track_event_api(req: TrackingEventRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    res = record_tracking_event(
        db=db,
        article_id=req.article_id,
        wordpress_post_id=req.wordpress_post_id,
        article_title=req.article_title,
        event_type=req.event_type,
        reading_seconds=req.reading_seconds,
        session_id=req.session_id,
        ip_address=client_ip,
        referrer=req.referrer,
        user_agent=user_agent
    )
    return res


# ---------------------------------------------------------------------------
# All Articles & Content Sync Endpoints
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/articles")
def get_admin_articles_api(
    page: int = 1,
    page_size: int = 20,
    status: str = "ALL",
    source: str = "ALL",
    search: str = "",
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    data = get_all_articles_with_stats(
        db=db,
        page=page,
        page_size=page_size,
        status_filter=status,
        source_filter=source,
        search=search
    )
    return {"success": True, **data}


@admin_router.post("/api/admin/articles/sync")
def sync_admin_articles_api(
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    res = sync_wordpress_posts(db)
    return res


# ---------------------------------------------------------------------------
# Admin API: SEO & Readability Engine & WordPress Re-Optimization
# ---------------------------------------------------------------------------

@admin_router.get("/api/admin/seo/overview")
def get_seo_overview_api(admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Returns real quality metrics, Yoast-compatible audit summaries, and synchronization status.
    """
    total_articles = db.query(GeneratedArticle).count()
    total_audited = db.query(GeneratedArticle).filter(GeneratedArticle.seo_score.isnot(None)).count()
    
    seo_good = db.query(GeneratedArticle).filter(GeneratedArticle.seo_status == "GOOD").count()
    seo_ok = db.query(GeneratedArticle).filter(GeneratedArticle.seo_status == "OK").count()
    seo_poor = db.query(GeneratedArticle).filter(GeneratedArticle.seo_status == "POOR").count()
    
    readability_good = db.query(GeneratedArticle).filter(GeneratedArticle.readability_status == "GOOD").count()
    readability_ok = db.query(GeneratedArticle).filter(GeneratedArticle.readability_status == "OK").count()
    readability_poor = db.query(GeneratedArticle).filter(GeneratedArticle.readability_status == "POOR").count()
    
    not_assessed = db.query(GeneratedArticle).filter(GeneratedArticle.seo_score.is_(None)).count()
    synced_count = db.query(GeneratedArticle).filter(GeneratedArticle.wordpress_post_id.isnot(None)).count()
    
    # Awaiting re-sync: articles that have an existing WordPress post and were optimized more recently than last sync
    awaiting_resync = db.query(GeneratedArticle).filter(
        GeneratedArticle.wordpress_post_id.isnot(None),
        GeneratedArticle.last_optimized_at.isnot(None),
        (GeneratedArticle.last_synced_at.is_(None) | (GeneratedArticle.last_optimized_at > GeneratedArticle.last_synced_at))
    ).count()
    
    optimized_count = db.query(GeneratedArticle).filter(
        GeneratedArticle.optimization_status.in_(["OPTIMIZED", "REVISION_PENDING"])
    ).count()
    
    pending_revisions = db.query(ArticleRevision).filter(ArticleRevision.status == "pending_review").count()
    
    return {
        "status": "success",
        "total_articles": total_articles,
        "total_audited": total_audited,
        "not_assessed": not_assessed,
        "good_seo": seo_good,
        "poor_seo": seo_poor,
        "poor_readability": readability_poor,
        "wp_synced": synced_count,
        "pending_sync": awaiting_resync,
        "optimized_count": optimized_count,
        "overview": {
            "total_articles": total_articles,
            "total_audited": total_audited,
            "not_assessed": not_assessed,
            "seo_breakdown": {
                "good": seo_good,
                "ok": seo_ok,
                "poor": seo_poor
            },
            "readability_breakdown": {
                "good": readability_good,
                "ok": readability_ok,
                "poor": readability_poor
            },
            "synced_to_wordpress": synced_count,
            "awaiting_resync": awaiting_resync,
            "optimized_articles": optimized_count,
            "pending_revisions": pending_revisions
        }
    }


@admin_router.get("/api/admin/seo/articles")
def get_seo_articles_api(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    status: str = "ALL",
    search: str = "",
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns filtered and paginated articles with their latest SEO & readability audit indicators.
    """
    query = db.query(GeneratedArticle)
    
    status_upper = status.upper().strip()
    if status_upper == "NOT_ASSESSED":
        query = query.filter(GeneratedArticle.seo_score.is_(None))
    elif status_upper == "NEEDS_IMPROVEMENT":
        query = query.filter(
            GeneratedArticle.seo_score.isnot(None),
            (GeneratedArticle.seo_status.in_(["POOR", "OK"]) | GeneratedArticle.readability_status.in_(["POOR", "OK"]))
        )
    elif status_upper == "GOOD":
        query = query.filter(
            GeneratedArticle.seo_status == "GOOD",
            GeneratedArticle.readability_status == "GOOD"
        )
    elif status_upper == "READABILITY_ISSUES":
        query = query.filter(GeneratedArticle.readability_status.in_(["POOR", "OK"]))
    elif status_upper == "SEO_ISSUES":
        query = query.filter(GeneratedArticle.seo_status.in_(["POOR", "OK"]))
    elif status_upper == "SYNCED":
        query = query.filter(GeneratedArticle.wordpress_post_id.isnot(None))
    elif status_upper == "NOT_SYNCED":
        query = query.filter(GeneratedArticle.wordpress_post_id.is_(None))
    elif status_upper == "OPTIMIZED":
        query = query.filter(GeneratedArticle.optimization_status.in_(["OPTIMIZED", "REVISION_PENDING"]))
    elif status_upper == "AWAITING_RESYNC":
        query = query.filter(
            GeneratedArticle.wordpress_post_id.isnot(None),
            GeneratedArticle.last_optimized_at.isnot(None),
            (GeneratedArticle.last_synced_at.is_(None) | (GeneratedArticle.last_optimized_at > GeneratedArticle.last_synced_at))
        )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (GeneratedArticle.title.ilike(term)) |
            (GeneratedArticle.category.ilike(term)) |
            (GeneratedArticle.focus_keyphrase.ilike(term))
        )

    total = query.count()
    articles = query.order_by(GeneratedArticle.generated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    # Pre-fetch pending revisions for these articles
    art_ids = [a.id for a in articles]
    pending_rev_map = {}
    if art_ids:
        revs = db.query(ArticleRevision).filter(
            ArticleRevision.article_id.in_(art_ids),
            ArticleRevision.status == "pending_review"
        ).all()
        for r in revs:
            pending_rev_map[r.article_id] = r.id

    items = []
    for a in articles:
        needs_resync = bool(
            a.wordpress_post_id and 
            a.last_optimized_at and 
            (not a.last_synced_at or a.last_optimized_at > a.last_synced_at)
        )
        
        items.append({
            "id": a.id,
            "title": a.title,
            "category": a.category or "Business & Economy",
            "focus_keyphrase": a.focus_keyphrase or (a.seo_metadata.get("focus_keyphrase") if a.seo_metadata else None),
            "seo_score": a.seo_score,
            "seo_status": a.seo_status or "NOT_ASSESSED",
            "readability_score": a.readability_score,
            "readability_status": a.readability_status or "NOT_ASSESSED",
            "optimization_status": a.optimization_status or "ORIGINAL",
            "last_optimized_at": a.last_optimized_at.strftime("%Y-%m-%d %H:%M:%S") if a.last_optimized_at else None,
            "wordpress_post_id": a.wordpress_post_id,
            "wordpress_status": a.wordpress_status or "Not Published",
            "last_synced_at": a.last_synced_at.strftime("%Y-%m-%d %H:%M:%S") if a.last_synced_at else None,
            "sync_status": a.sync_status,
            "needs_resync": needs_resync,
            "has_pending_revision": a.id in pending_rev_map,
            "latest_revision_id": pending_rev_map.get(a.id),
            "pending_revision_id": pending_rev_map.get(a.id),
            "article_url": f"/inpartner/article/{a.id}"
        })

    return {
        "status": "success",
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "articles": items
    }


@admin_router.post("/api/admin/seo/audit/{article_id}")
def audit_single_article_api(
    article_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Executes a deterministic SEO & Readability audit on a single article.
    """
    audit = run_article_audit(db, article_id)
    if not audit:
        return JSONResponse({"status": "error", "success": False, "message": f"Article #{article_id} not found.", "error": f"Article #{article_id} not found."}, status_code=404)
        
    audit_dict = {
        "article_id": article_id,
        "evaluator_version": audit.evaluator_version,
        "audited_at": audit.audited_at.strftime("%Y-%m-%d %H:%M:%S"),
        "focus_keyphrase": audit.focus_keyphrase,
        "seo_score": audit.seo_score,
        "seo_status": audit.seo_status,
        "readability_score": audit.readability_score,
        "readability_status": audit.readability_status,
        "metrics": audit.metrics,
        "issues": audit.issues
    }
    return {
        "status": "success",
        "success": True,
        "audit": audit_dict,
        **audit_dict
    }


@admin_router.post("/api/admin/seo/bulk-audit")
def bulk_audit_articles_api(
    req: BulkAuditRequest,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Runs deterministic audit on multiple articles. Fast, deterministic, zero AI hallucinations.
    """
    target_ids = []
    if req.all_unassessed:
        arts = db.query(GeneratedArticle.id).filter(GeneratedArticle.seo_score.is_(None)).all()
        target_ids = [a[0] for a in arts]
    elif req.article_ids:
        target_ids = req.article_ids[:100] # Safe cap per bulk call
        
    if not target_ids:
        return JSONResponse({"status": "error", "message": "No articles specified for audit."}, status_code=400)
        
    audited = []
    failed = []
    for aid in target_ids:
        try:
            audit = run_article_audit(db, aid)
            if audit:
                audited.append({
                    "article_id": aid,
                    "seo_score": audit.seo_score,
                    "seo_status": audit.seo_status,
                    "readability_score": audit.readability_score,
                    "readability_status": audit.readability_status
                })
            else:
                failed.append({"article_id": aid, "error": "Not found"})
        except Exception as e:
            failed.append({"article_id": aid, "error": str(e)})

    return {
        "status": "success",
        "message": f"Successfully audited {len(audited)} articles.",
        "audited_count": len(audited),
        "failed_count": len(failed),
        "results": audited,
        "failures": failed
    }


@admin_router.post("/api/admin/seo/optimize/{article_id}")
def optimize_single_article_api(
    article_id: int,
    req: OptimizeArticleRequest = None,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Generates a targeted, AI-optimized revision guided strictly by detected SEO & readability issues.
    Preserves original article and stores a diff snapshot for approval.
    """
    auto_accept = req.auto_accept if req else False
    res = optimize_article_and_create_revision(db, article_id, auto_accept=auto_accept)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
        
    return {
        "status": "success",
        **res
    }


@admin_router.post("/api/admin/seo/bulk-optimize")
def bulk_optimize_articles_api(
    req: BulkOptimizeRequest,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Runs targeted optimization sequentially across selected articles.
    Capped at 5 articles per batch for stability and rate limits.
    """
    article_ids = req.article_ids[:5]
    if not article_ids:
        return JSONResponse({"status": "error", "message": "No articles selected."}, status_code=400)
        
    results = []
    for aid in article_ids:
        res = optimize_article_and_create_revision(db, aid, auto_accept=req.auto_accept)
        results.append({
            "article_id": aid,
            "success": res.get("success", False),
            "revision_id": res.get("revision_id"),
            "before_scores": res.get("before_scores"),
            "after_scores": res.get("after_scores"),
            "error": res.get("error")
        })

    succeeded = sum(1 for r in results if r["success"])
    return {
        "status": "success",
        "message": f"Bulk optimization completed. {succeeded}/{len(results)} revisions created.",
        "results": results
    }


@admin_router.get("/api/admin/seo/revision/{revision_id}")
def get_revision_detail_api(
    revision_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details of a revision snapshot including content diff and score changes.
    """
    rev = db.query(ArticleRevision).filter(ArticleRevision.id == revision_id).first()
    if not rev:
        return JSONResponse({"status": "error", "message": "Revision not found."}, status_code=404)
        
    art = db.query(GeneratedArticle).filter(GeneratedArticle.id == rev.article_id).first()
    
    return {
        "status": "success",
        "revision": {
            "id": rev.id,
            "article_id": rev.article_id,
            "revision_number": rev.revision_number,
            "created_at": rev.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "status": rev.status,
            "source_type": rev.source_type,
            "change_summary": rev.change_summary,
            "original_title": art.title if art else "",
            "revised_title": rev.title,
            "original_subtitle": art.subtitle if art else "",
            "revised_subtitle": rev.subtitle,
            "original_content": art.content if art else "",
            "revised_content": rev.content,
            "diff_data": rev.diff_data,
            "audit_snapshot": rev.audit_snapshot,
            "seo_metadata": rev.seo_metadata
        }
    }


@admin_router.post("/api/admin/seo/revision/{revision_id}/accept")
def accept_revision_api(
    revision_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Approves and applies a proposed revision to the main article record.
    """
    res = accept_article_revision(db, revision_id)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
    return res


@admin_router.post("/api/admin/seo/revision/{revision_id}/reject")
def reject_revision_api(
    revision_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Rejects a proposed revision without modifying the active article.
    """
    res = reject_article_revision(db, revision_id)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
    return res


@admin_router.get("/api/admin/seo/article/{article_id}/history")
def get_article_seo_history_api(
    article_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves complete audit and revision history for an article.
    """
    art = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not art:
        return JSONResponse({"status": "error", "message": "Article not found."}, status_code=404)
        
    audits = db.query(ArticleAudit).filter(
        ArticleAudit.article_id == article_id
    ).order_by(ArticleAudit.audited_at.desc()).limit(20).all()
    
    revisions = db.query(ArticleRevision).filter(
        ArticleRevision.article_id == article_id
    ).order_by(ArticleRevision.revision_number.desc()).limit(20).all()
    
    sync_logs = db.query(WordPressSyncLog).filter(
        WordPressSyncLog.article_id == article_id
    ).order_by(WordPressSyncLog.synced_at.desc()).limit(20).all()

    return {
        "status": "success",
        "article": {
            "id": art.id,
            "title": art.title,
            "focus_keyphrase": art.focus_keyphrase,
            "seo_score": art.seo_score,
            "seo_status": art.seo_status,
            "readability_score": art.readability_score,
            "readability_status": art.readability_status,
            "wordpress_post_id": art.wordpress_post_id,
            "wordpress_status": art.wordpress_status
        },
        "audits": [{
            "id": a.id,
            "audited_at": a.audited_at.strftime("%Y-%m-%d %H:%M:%S"),
            "seo_score": a.seo_score,
            "seo_status": a.seo_status,
            "readability_score": a.readability_score,
            "readability_status": a.readability_status,
            "is_latest": a.is_latest,
            "issues_count": len(a.issues or [])
        } for a in audits],
        "revisions": [{
            "id": r.id,
            "revision_number": r.revision_number,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "source_type": r.source_type,
            "title": r.title,
            "status": r.status,
            "change_summary": r.change_summary,
            "audit_snapshot": r.audit_snapshot
        } for r in revisions],
        "sync_logs": [{
            "id": sl.id,
            "wordpress_post_id": sl.wordpress_post_id,
            "synced_at": sl.synced_at.strftime("%Y-%m-%d %H:%M:%S"),
            "sync_type": sl.sync_type,
            "status": sl.status,
            "response_code": sl.response_code,
            "error_message": sl.error_message
        } for sl in sync_logs]
    }


@admin_router.get("/api/admin/seo/sync-preview/{article_id}")
def sync_preview_api(
    article_id: int,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns pre-synchronization preview comparing local optimized content with target WordPress post.
    """
    res = preview_wordpress_sync(db, article_id)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
    return res


@admin_router.post("/api/admin/seo/re-sync/{article_id}")
def re_sync_article_api(
    article_id: int,
    req: ReSyncRequest = None,
    admin: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Safely re-synchronizes an approved, optimized article to its existing WordPress post.
    Never creates duplicate posts. Preserves publication status.
    """
    res = re_sync_article_to_wordpress(db, article_id)
    if not res.get("success"):
        return JSONResponse({"status": "error", "message": res.get("error")}, status_code=400)
    return res

