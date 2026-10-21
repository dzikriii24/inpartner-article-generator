import json
import hashlib
import re
import html
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
import requests
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from database import SessionLocal
from models import (
    GeneratedArticle,
    AutomationSetting,
    ArticleAnalyticsDaily,
    AnalyticsSyncLog,
    ArticleTrackingEvent,
    ArticleStatus
)
from services.wordpress_service import clean_wp_url, WP_USER_AGENT, test_wordpress_connection


def record_tracking_event(
    db: Session,
    article_id: Optional[int] = None,
    wordpress_post_id: Optional[int] = None,
    article_title: Optional[str] = None,
    event_type: str = "view",
    reading_seconds: int = 0,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    referrer: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """
    Records a reader interaction event (view, click, reading_heartbeat)
    and aggregates into article_analytics_daily.
    """
    if not article_id and not wordpress_post_id:
        return {"status": "ignored", "message": "Missing article_id or wordpress_post_id."}

    today_date = date.today()
    ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16] if ip_address else None

    # Find article title if article_id provided
    art_title = None
    if article_id:
        art = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        if art:
            art_title = art.title
            if not wordpress_post_id and art.wordpress_post_id:
                wordpress_post_id = art.wordpress_post_id
    elif wordpress_post_id:
        art = db.query(GeneratedArticle).filter(GeneratedArticle.wordpress_post_id == wordpress_post_id).first()
        if art:
            article_id = art.id
            art_title = art.title

    if not art_title and article_title:
        art_title = article_title.strip()

    event = ArticleTrackingEvent(
        article_id=article_id,
        wordpress_post_id=wordpress_post_id,
        event_type=event_type,
        reading_seconds=max(0, reading_seconds),
        session_id=session_id or ip_hash,
        ip_hash=ip_hash,
        referrer=referrer[:490] if referrer else None,
        user_agent=user_agent[:250] if user_agent else None,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.flush()

    # Get or create daily aggregate row
    agg_query = db.query(ArticleAnalyticsDaily).filter(ArticleAnalyticsDaily.date == today_date)
    if article_id:
        agg = agg_query.filter(ArticleAnalyticsDaily.article_id == article_id).first()
    elif wordpress_post_id:
        agg = agg_query.filter(ArticleAnalyticsDaily.wordpress_post_id == wordpress_post_id).first()
    else:
        agg = None

    if not agg:
        agg = ArticleAnalyticsDaily(
            article_id=article_id,
            wordpress_post_id=wordpress_post_id,
            article_title=art_title or f"Article #{article_id or wordpress_post_id}",
            date=today_date,
            pageviews=0,
            unique_visitors=0,
            clicks=0,
            avg_engagement_time=0.0,
            engagement_rate=0.0,
            source="internal",
            updated_at=datetime.utcnow()
        )
        db.add(agg)
        db.flush()

    if event_type == "view":
        agg.pageviews += 1
    elif event_type == "click":
        agg.clicks += 1
    elif event_type == "reading_heartbeat":
        # Incremental reading time
        pass

    # Recalculate unique visitors and average engagement for this article today
    sub_q = db.query(
        func.count(distinct(ArticleTrackingEvent.session_id)),
        func.sum(ArticleTrackingEvent.reading_seconds)
    )
    if article_id:
        sub_q = sub_q.filter(ArticleTrackingEvent.article_id == article_id)
    elif wordpress_post_id:
        sub_q = sub_q.filter(ArticleTrackingEvent.wordpress_post_id == wordpress_post_id)

    today_start = datetime.combine(today_date, datetime.min.time())
    sub_q = sub_q.filter(ArticleTrackingEvent.created_at >= today_start)
    unique_count, total_seconds = sub_q.first() or (1, 0)

    agg.unique_visitors = max(1, unique_count or 1)
    if agg.pageviews > 0:
        agg.avg_engagement_time = round((total_seconds or 0) / max(1, agg.pageviews), 1)
        # Engagement rate: percentage of pageviews that had clicks or >=15s reading
        engaged_views = db.query(ArticleTrackingEvent.session_id).filter(
            ArticleTrackingEvent.article_id == article_id if article_id else ArticleTrackingEvent.wordpress_post_id == wordpress_post_id,
            ArticleTrackingEvent.created_at >= today_start,
            (ArticleTrackingEvent.reading_seconds >= 15) | (ArticleTrackingEvent.event_type == "click")
        ).distinct().count()
        agg.engagement_rate = round(min(100.0, (engaged_views / max(1, agg.unique_visitors)) * 100.0), 1)

    agg.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "success", "event_id": event.id}


def sync_wordpress_posts(db: Session, setting: Optional[AutomationSetting] = None) -> Dict[str, Any]:
    """
    Syncs posts and publishing status directly from the WordPress REST API.
    """
    if not setting:
        setting = db.query(AutomationSetting).first()

    wp_url = setting.wp_url if setting else None
    wp_username = setting.wp_username if setting else None
    wp_pwd = setting.wp_app_password if setting else None

    if not wp_url or not wp_username or not wp_pwd:
        return {
            "success": False,
            "error": "WordPress credentials not configured in Automation Settings."
        }

    clean_url = clean_wp_url(wp_url)
    auth = (wp_username, wp_pwd.replace(" ", ""))
    headers = {"User-Agent": WP_USER_AGENT}

    try:
        # Fetch posts
        endpoint = f"{clean_url}/wp-json/wp/v2/posts?per_page=100&status=publish,draft,future,pending"
        resp = requests.get(endpoint, auth=auth, headers=headers, timeout=30)

        if resp.status_code != 200:
            err = f"Failed to fetch WP posts (HTTP {resp.status_code}): {resp.text[:200]}"
            db.add(AnalyticsSyncLog(sync_type="wordpress_metadata", status="FAILED", message=err))
            db.commit()
            return {"success": False, "error": err}

        posts = resp.json()
        synced_count = 0

        for p in posts:
            p_id = p.get("id")
            raw_title = p.get("title", {}).get("rendered", "")
            p_title = html.unescape(raw_title) if raw_title else ""
            p_status = p.get("status", "draft")
            p_link = p.get("link", "")
            p_slug = p.get("slug", "")
            p_date_str = p.get("date_gmt") or p.get("date")

            pub_dt = None
            if p_date_str:
                try:
                    pub_dt = datetime.fromisoformat(p_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    pub_dt = datetime.utcnow()

            wp_author = (p.get("_embedded", {}).get("author", [{}])[0].get("name") if p.get("_embedded") else None) or "WordPress Editor (Manual)"

            # Try to match with existing GeneratedArticle
            art = db.query(GeneratedArticle).filter(
                (GeneratedArticle.wordpress_post_id == p_id) | (GeneratedArticle.title.ilike(p_title[:100]))
            ).first()

            if art:
                art.wordpress_post_id = p_id
                art.wordpress_site = clean_url
                art.wordpress_status = p_status.capitalize()
                art.last_synced_at = datetime.utcnow()
                art.sync_status = "Synced"
                if p_status == "publish" and not art.published_at:
                    art.published_at = pub_dt or datetime.utcnow()
                
                # Store slug and wp_link in seo_metadata
                seo_meta = dict(art.seo_metadata) if isinstance(art.seo_metadata, dict) else {}
                seo_meta["slug"] = p_slug
                seo_meta["wp_link"] = p_link
                art.seo_metadata = seo_meta
                synced_count += 1
            else:
                # Import manual post from WordPress!
                content_raw = p.get("content", {}).get("rendered", "")
                excerpt_raw = p.get("excerpt", {}).get("rendered", "")
                excerpt_clean = re.sub(r'<[^>]+>', '', excerpt_raw).strip() if excerpt_raw else None

                art = GeneratedArticle(
                    title=p_title or f"WordPress Post #{p_id}",
                    subtitle=excerpt_clean[:400] if excerpt_clean else None,
                    content=content_raw,
                    category="WordPress Editorial",
                    author=wp_author,
                    status=ArticleStatus.PUBLISHED if p_status == "publish" else ArticleStatus.DRAFT,
                    generation_step="COMPLETED",
                    generated_at=pub_dt or datetime.utcnow(),
                    published_at=pub_dt if p_status == "publish" else None,
                    wordpress_post_id=p_id,
                    wordpress_site=clean_url,
                    wordpress_status=p_status.capitalize(),
                    seo_metadata={"slug": p_slug, "wp_link": p_link},
                    last_synced_at=datetime.utcnow(),
                    sync_status="Synced (Manual WP Post)"
                )
                db.add(art)
                synced_count += 1

        db.add(AnalyticsSyncLog(
            sync_type="wordpress_metadata",
            status="SUCCESS",
            records_synced=synced_count,
            message=f"Synced {synced_count} WordPress articles from {clean_url}"
        ))
        db.commit()

        return {
            "success": True,
            "synced_count": synced_count,
            "total_wp_posts": len(posts)
        }

    except Exception as e:
        err_msg = str(e)
        db.add(AnalyticsSyncLog(sync_type="wordpress_metadata", status="FAILED", message=err_msg))
        db.commit()
        return {"success": False, "error": err_msg}


def sync_ga4_data(db: Session, setting: Optional[AutomationSetting] = None) -> Dict[str, Any]:
    """
    Syncs traffic metrics from Google Analytics 4 Data API if configured.
    """
    if not setting:
        setting = db.query(AutomationSetting).first()

    property_id = setting.ga4_property_id if setting else None
    credentials_json = setting.ga4_credentials_json if setting else None

    if not property_id or not credentials_json:
        return {
            "success": False,
            "status": "NOT_CONNECTED",
            "message": "GA4 Property ID or Service Account Credentials JSON is not configured."
        }

    try:
        # Parse credentials JSON
        creds_data = json.loads(credentials_json)
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials = service_account.Credentials.from_service_account_info(
            creds_data,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"]
        )

        analytics_data = build("analyticsdata", "v1beta", credentials=credentials)
        clean_prop_id = property_id.replace("properties/", "").strip()

        request_body = {
            "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
            "dimensions": [{"name": "pagePath"}, {"name": "pageTitle"}],
            "metrics": [
                {"name": "screenPageViews"},
                {"name": "activeUsers"},
                {"name": "userEngagementDuration"}
            ]
        }

        response = analytics_data.properties().runReport(
            property=f"properties/{clean_prop_id}",
            body=request_body
        ).execute()

        rows = response.get("rows", [])
        synced_count = len(rows)

        # Store sync log
        db.add(AnalyticsSyncLog(
            sync_type="ga4",
            status="SUCCESS",
            records_synced=synced_count,
            message=f"Successfully queried GA4 Property {clean_prop_id}. Fetched {synced_count} page records."
        ))
        db.commit()

        return {
            "success": True,
            "status": "CONNECTED",
            "message": f"Successfully synced {synced_count} GA4 metrics.",
            "records_count": synced_count
        }

    except Exception as e:
        err = str(e)
        db.add(AnalyticsSyncLog(sync_type="ga4", status="FAILED", message=err))
        db.commit()
        return {
            "success": False,
            "status": "FAILED",
            "error": f"GA4 API Error: {err}"
        }


def get_analytics_overview(
    db: Session,
    period_days: int = 7,
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None
) -> Dict[str, Any]:
    """
    Computes aggregated analytics metrics, top performing articles, and trend lines.
    """
    today = date.today()
    if custom_start and custom_end:
        start_date = custom_start
        end_date = custom_end
    else:
        start_date = today - timedelta(days=max(1, period_days))
        end_date = today

    # 1. Check Integration Statuses
    setting = db.query(AutomationSetting).first()
    wp_connected = False
    wp_site_url = None
    if setting and setting.wp_url and setting.wp_username and setting.wp_app_password:
        wp_res = test_wordpress_connection(setting.wp_url, setting.wp_username, setting.wp_app_password)
        wp_connected = wp_res.get("success", False)
        wp_site_url = clean_wp_url(setting.wp_url)

    ga4_configured = bool(setting and setting.ga4_property_id and setting.ga4_credentials_json)

    # 2. Daily aggregate records in range
    daily_rows = db.query(ArticleAnalyticsDaily).filter(
        ArticleAnalyticsDaily.date >= start_date,
        ArticleAnalyticsDaily.date <= end_date
    ).all()

    # Also aggregate live tracking events if daily_rows is empty
    total_views = sum(r.pageviews for r in daily_rows)
    total_uniques = sum(r.unique_visitors for r in daily_rows)
    total_clicks = sum(r.clicks for r in daily_rows)
    
    # Calculate weighted avg engagement
    total_weighted_sec = sum(r.avg_engagement_time * max(1, r.pageviews) for r in daily_rows)
    avg_engagement_sec = round(total_weighted_sec / max(1, total_views), 1) if total_views > 0 else 0.0

    avg_engagement_rate = round(sum(r.engagement_rate for r in daily_rows) / max(1, len(daily_rows)), 1) if daily_rows else 0.0

    # Format engagement time mm:ss
    minutes, seconds = divmod(int(avg_engagement_sec), 60)
    avg_engagement_formatted = f"{minutes}m {seconds:02d}s"

    # 3. Daily Traffic Trend for Chart.js
    trend_labels = []
    trend_views = []
    trend_visitors = []
    trend_clicks = []

    curr_d = start_date
    while curr_d <= end_date:
        d_str = curr_d.strftime("%b %d")
        trend_labels.append(d_str)

        d_rows = [r for r in daily_rows if r.date == curr_d]
        v_count = sum(r.pageviews for r in d_rows)
        u_count = sum(r.unique_visitors for r in d_rows)
        c_count = sum(r.clicks for r in d_rows)

        trend_views.append(v_count)
        trend_visitors.append(u_count)
        trend_clicks.append(c_count)
        curr_d += timedelta(days=1)

    # 4. Top Performing Articles (strictly valid articles with actual article_id or wordpress_post_id)
    top_articles_query = db.query(
        ArticleAnalyticsDaily.article_id,
        ArticleAnalyticsDaily.wordpress_post_id,
        ArticleAnalyticsDaily.article_title,
        func.sum(ArticleAnalyticsDaily.pageviews).label("total_views"),
        func.sum(ArticleAnalyticsDaily.unique_visitors).label("total_visitors"),
        func.sum(ArticleAnalyticsDaily.clicks).label("total_clicks"),
        func.avg(ArticleAnalyticsDaily.avg_engagement_time).label("avg_time"),
        func.avg(ArticleAnalyticsDaily.engagement_rate).label("avg_rate")
    ).filter(
        ArticleAnalyticsDaily.date >= start_date,
        ArticleAnalyticsDaily.date <= end_date,
        (ArticleAnalyticsDaily.article_id.isnot(None) | ArticleAnalyticsDaily.wordpress_post_id.isnot(None)),
        ArticleAnalyticsDaily.article_title != "Article #None",
        ~ArticleAnalyticsDaily.article_title.like("%#None%")
    ).group_by(
        ArticleAnalyticsDaily.article_id,
        ArticleAnalyticsDaily.wordpress_post_id,
        ArticleAnalyticsDaily.article_title
    ).order_by(func.sum(ArticleAnalyticsDaily.pageviews).desc()).limit(10).all()

    top_articles = []
    for r in top_articles_query:
        art = None
        if r.article_id:
            art = db.query(GeneratedArticle).filter(GeneratedArticle.id == r.article_id).first()
        elif r.wordpress_post_id:
            art = db.query(GeneratedArticle).filter(GeneratedArticle.wordpress_post_id == r.wordpress_post_id).first()

        clean_title = (art.title if art else r.article_title) or "Untitled Article"
        if "None" in clean_title and not art:
            continue

        m_sec = round(float(r.avg_time or 0), 1)
        m_mins, m_rem = divmod(int(m_sec), 60)

        article_url = f"/inpartner/article/{art.id}" if art else (f"/inpartner/article/{r.article_id}" if r.article_id else "#")

        top_articles.append({
            "article_id": r.article_id,
            "wordpress_post_id": r.wordpress_post_id,
            "title": clean_title,
            "category": (art.category if art and art.category else "Editorial"),
            "pageviews": int(r.total_views or 0),
            "unique_visitors": int(r.total_visitors or 0),
            "clicks": int(r.total_clicks or 0),
            "avg_engagement_time": f"{m_mins}m {m_rem:02d}s",
            "engagement_rate": f"{round(float(r.avg_rate or 0), 1)}%",
            "wordpress_status": (art.wordpress_status if art and art.wordpress_status else "Published"),
            "article_url": article_url
        })

    # 5. Published WordPress Articles list
    wp_articles_query = db.query(GeneratedArticle).filter(
        GeneratedArticle.wordpress_post_id.isnot(None)
    ).order_by(GeneratedArticle.last_synced_at.desc()).limit(20).all()

    wp_articles = []
    for a in wp_articles_query:
        wp_articles.append({
            "id": a.id,
            "title": a.title,
            "category": a.category,
            "wordpress_post_id": a.wordpress_post_id,
            "wordpress_status": a.wordpress_status,
            "wordpress_site": a.wordpress_site,
            "last_synced": a.last_synced_at.strftime("%Y-%m-%d %H:%M") if a.last_synced_at else "-",
            "article_url": f"/inpartner/article/{a.id}"
        })

    # 6. Last Sync info
    last_sync = db.query(AnalyticsSyncLog).order_by(AnalyticsSyncLog.synced_at.desc()).first()
    last_sync_str = last_sync.synced_at.strftime("%Y-%m-%d %H:%M:%S UTC") if last_sync else "Never"

    return {
        "status": "success",
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        },
        "integrations": {
            "wordpress": {
                "connected": wp_connected,
                "site_url": wp_site_url
            },
            "ga4": {
                "connected": ga4_configured,
                "property_id": setting.ga4_property_id if setting else None
            }
        },
        "metrics": {
            "pageviews": total_views,
            "unique_visitors": total_uniques,
            "clicks": total_clicks,
            "avg_engagement_time": avg_engagement_formatted,
            "avg_engagement_seconds": avg_engagement_sec,
            "engagement_rate": f"{avg_engagement_rate}%"
        },
        "traffic_trend": {
            "labels": trend_labels,
            "pageviews": trend_views,
            "unique_visitors": trend_visitors,
            "clicks": trend_clicks
        },
        "top_articles": top_articles,
        "wordpress_articles": wp_articles,
        "last_sync": last_sync_str
    }


def get_all_articles_with_stats(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status_filter: str = "ALL",
    source_filter: str = "ALL",
    search: str = ""
) -> Dict[str, Any]:
    """
    Retrieves unified catalog of all articles (both AI generated and manual WP posts)
    along with their real-time performance statistics, WordPress publish status, and sync state.
    """
    query = db.query(GeneratedArticle)

    # 1. Search Filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (GeneratedArticle.title.ilike(term)) |
            (GeneratedArticle.author.ilike(term)) |
            (GeneratedArticle.category.ilike(term))
        )

    # 2. Status Filter
    # Options: ALL, PUBLISHED, DRAFT, NOT_PUBLISHED
    if status_filter == "PUBLISHED":
        query = query.filter(
            (GeneratedArticle.wordpress_status.ilike("publish%")) |
            (GeneratedArticle.status == ArticleStatus.PUBLISHED)
        )
    elif status_filter == "DRAFT":
        query = query.filter(
            (GeneratedArticle.wordpress_status.ilike("draft%")) |
            (GeneratedArticle.status == ArticleStatus.DRAFT)
        )
    elif status_filter == "NOT_PUBLISHED":
        query = query.filter(
            (GeneratedArticle.wordpress_status == "Not Published") |
            (GeneratedArticle.wordpress_status.is_(None))
        )

    # 3. Source Filter
    # Options: ALL, AI, MANUAL
    if source_filter == "AI":
        query = query.filter(
            ~GeneratedArticle.author.ilike("%Manual%"),
            ~GeneratedArticle.sync_status.ilike("%Manual%")
        )
    elif source_filter == "MANUAL":
        query = query.filter(
            (GeneratedArticle.author.ilike("%Manual%")) |
            (GeneratedArticle.sync_status.ilike("%Manual%"))
        )

    # Global summaries
    all_articles = db.query(GeneratedArticle).all()
    total_count = len(all_articles)
    published_count = sum(1 for a in all_articles if (a.wordpress_status and a.wordpress_status.lower() in ["publish", "published"]) or a.status == ArticleStatus.PUBLISHED)
    draft_count = sum(1 for a in all_articles if (a.wordpress_status and a.wordpress_status.lower() in ["draft", "pending"]) or a.status in [ArticleStatus.DRAFT, ArticleStatus.READY])
    total_views = db.query(func.sum(ArticleAnalyticsDaily.pageviews)).scalar() or 0

    # Filtered count and pagination
    filtered_total = query.count()
    offset = max(0, (page - 1) * page_size)
    articles = query.order_by(GeneratedArticle.generated_at.desc()).offset(offset).limit(page_size).all()

    # Pre-fetch metrics for these articles
    art_ids = [a.id for a in articles]
    wp_ids = [a.wordpress_post_id for a in articles if a.wordpress_post_id]

    analytics_map = {}
    if art_ids or wp_ids:
        rows = db.query(
            ArticleAnalyticsDaily.article_id,
            ArticleAnalyticsDaily.wordpress_post_id,
            func.sum(ArticleAnalyticsDaily.pageviews).label("views"),
            func.sum(ArticleAnalyticsDaily.unique_visitors).label("visitors"),
            func.sum(ArticleAnalyticsDaily.clicks).label("clicks"),
            func.avg(ArticleAnalyticsDaily.avg_engagement_time).label("avg_time"),
            func.avg(ArticleAnalyticsDaily.engagement_rate).label("avg_rate")
        ).filter(
            (ArticleAnalyticsDaily.article_id.in_(art_ids)) |
            (ArticleAnalyticsDaily.wordpress_post_id.in_(wp_ids))
        ).group_by(
            ArticleAnalyticsDaily.article_id,
            ArticleAnalyticsDaily.wordpress_post_id
        ).all()

        for r in rows:
            key = f"art_{r.article_id}" if r.article_id else f"wp_{r.wordpress_post_id}"
            analytics_map[key] = {
                "views": int(r.views or 0),
                "visitors": int(r.visitors or 0),
                "clicks": int(r.clicks or 0),
                "avg_time": round(float(r.avg_time or 0), 1),
                "avg_rate": round(float(r.avg_rate or 0), 1)
            }

    items = []
    for a in articles:
        # Match metrics
        m = analytics_map.get(f"art_{a.id}") or (analytics_map.get(f"wp_{a.wordpress_post_id}") if a.wordpress_post_id else None) or {
            "views": 0, "visitors": 0, "clicks": 0, "avg_time": 0.0, "avg_rate": 0.0
        }

        is_manual = bool(
            (a.author and "Manual" in a.author) or
            (a.sync_status and "Manual" in a.sync_status)
        )

        wp_st = (a.wordpress_status or "").capitalize()
        if wp_st in ["Publish", "Published"]:
            final_status = "Published"
            badge_class = "status-active"
        elif wp_st in ["Draft", "Pending"]:
            final_status = wp_st
            badge_class = "status-paused"
        elif a.status == ArticleStatus.READY:
            final_status = "Ready (Draft)"
            badge_class = "status-paused"
        elif a.status == ArticleStatus.PUBLISHED:
            final_status = "Published"
            badge_class = "status-active"
        else:
            final_status = "Not Published"
            badge_class = "status-failed"

        sec = int(m["avg_time"])
        mins, rem_s = divmod(sec, 60)
        formatted_time = f"{mins}m {rem_s:02d}s"

        slug = None
        wp_link = None
        if isinstance(a.seo_metadata, dict):
            slug = a.seo_metadata.get("slug")
            wp_link = a.seo_metadata.get("wp_link")

        items.append({
            "id": a.id,
            "title": a.title or "Untitled",
            "category": a.category or "Editorial",
            "author": a.author or "Inpartner",
            "source_type": "Manual WordPress" if is_manual else "AI Generated",
            "wordpress_post_id": a.wordpress_post_id,
            "wordpress_status": wp_st or "Not Published",
            "status_label": final_status,
            "badge_class": badge_class,
            "slug": slug,
            "wp_link": wp_link,
            "pageviews": m["views"],
            "unique_visitors": m["visitors"],
            "clicks": m["clicks"],
            "avg_reading_time": formatted_time,
            "engagement_rate": f"{m['avg_rate']}%",
            "generated_at": a.generated_at.strftime("%Y-%m-%d %H:%M") if a.generated_at else "-",
            "published_at": a.published_at.strftime("%Y-%m-%d %H:%M") if a.published_at else "-",
            "last_synced_at": a.last_synced_at.strftime("%Y-%m-%d %H:%M") if a.last_synced_at else "-",
            "article_url": f"/inpartner/article/{a.id}",
            "blog_url": f"/blog/{slug}" if slug else None
        })

    return {
        "summary": {
            "total_articles": total_count,
            "published_articles": published_count,
            "draft_articles": draft_count,
            "total_pageviews": total_views
        },
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": filtered_total,
            "total_pages": max(1, (filtered_total + page_size - 1) // page_size)
        },
        "articles": items
    }

