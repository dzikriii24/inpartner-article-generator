import time
import os
import re
import threading
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    AutomationSetting,
    AutomationExecution,
    AutomationExecutionItem,
    Topic,
    GeneratedArticle,
    ArticleStatus,
    ArticleTopic
)
from services.generator import generate_article_for_topic, update_article_step
from services.quota_service import record_article_generation
from services.wordpress_service import publish_to_wordpress

# Global background scheduler instance
_scheduler: Optional[BackgroundScheduler] = None
_automation_running_lock = threading.Lock()
_current_running_execution_id: Optional[int] = None

DEFAULT_SELECTED_TOPICS = [
    "Global Markets",
    "Indonesian Economy",
    "Enterprise AI",
    "Stocks & Equities",
    "Corporate Strategy"
]


def scrub_sensitive_info(text: Optional[str]) -> Optional[str]:
    """
    Scrubs passwords, API keys, and sensitive tokens from error strings.
    """
    if not text:
        return text
    # Remove password parameters or values
    scrubbed = re.sub(r'(password|app_password|secret|token|api_key)=([^\s&]+)', r'\1=[REDACTED]', text, flags=re.IGNORECASE)
    # Remove raw auth strings or long hex tokens
    scrubbed = re.sub(r'Basic\s+[A-Za-z0-9+/=]+', 'Basic [REDACTED]', scrubbed)
    scrubbed = re.sub(r'Bearer\s+[A-Za-z0-9_\-\.]+', 'Bearer [REDACTED]', scrubbed)
    return scrubbed


def get_or_create_automation_settings(db: Session) -> AutomationSetting:
    setting = db.query(AutomationSetting).first()
    if not setting:
        setting = AutomationSetting(
            is_enabled=True,
            schedule_hour=8,
            schedule_minute=0,
            timezone="Asia/Jakarta",
            articles_per_day=5,
            selected_topics=DEFAULT_SELECTED_TOPICS,
            topic_strategy="round_robin",
            language="English",
            target_audience="Decision Makers",
            writing_style="Analytical & Executive",
            article_length="Medium (~1200 words)",
            direct_publish_wp=False,
            updated_at=datetime.utcnow()
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


def calculate_next_run(setting: AutomationSetting) -> Optional[datetime]:
    """
    Calculates next execution datetime based on setting hour, minute, and timezone.
    """
    if not setting.is_enabled:
        return None
    try:
        tz = pytz.timezone(setting.timezone or "Asia/Jakarta")
        now_tz = datetime.now(tz)
        target = now_tz.replace(
            hour=setting.schedule_hour,
            minute=setting.schedule_minute,
            second=0,
            microsecond=0
        )
        if target <= now_tz:
            target += timedelta(days=1)
        return target
    except Exception as e:
        print(f"[Scheduler] Error calculating next run: {e}")
        return None


def select_topics_for_generation(db: Session, setting: AutomationSetting, count: int) -> List[str]:
    """
    Picks a balanced list of topic names based on settings and configured strategy.
    """
    raw_topics = setting.selected_topics
    if not raw_topics or not isinstance(raw_topics, list):
        # Fallback to active topics in database
        active_db_topics = db.query(ArticleTopic).filter(ArticleTopic.is_active == True).all()
        raw_topics = [t.name for t in active_db_topics] if active_db_topics else DEFAULT_SELECTED_TOPICS

    # Deduplicate while preserving order
    clean_pool = []
    seen = set()
    for t in raw_topics:
        t_clean = str(t).strip()
        if t_clean and t_clean.lower() not in seen:
            clean_pool.append(t_clean)
            seen.add(t_clean.lower())

    if not clean_pool:
        clean_pool = DEFAULT_SELECTED_TOPICS

    strategy = (setting.topic_strategy or "round_robin").lower()
    selected: List[str] = []

    if strategy == "random":
        import random
        # Sample with replacement if count > pool size
        if count <= len(clean_pool):
            selected = random.sample(clean_pool, count)
        else:
            selected = list(clean_pool)
            while len(selected) < count:
                selected.append(random.choice(clean_pool))
    else:
        # Default: round_robin based on latest executions count to rotate
        last_exec_count = db.query(AutomationExecution).count()
        offset = (last_exec_count * count) % len(clean_pool)
        for i in range(count):
            idx = (offset + i) % len(clean_pool)
            selected.append(clean_pool[idx])

    return selected[:count]


def execute_automation_pipeline(trigger_type: str = "SCHEDULED") -> Dict[str, Any]:
    """
    Executes the daily article generation batch.
    Thread-safe, handles partial failures gracefully, logs executions and items to DB.
    """
    global _current_running_execution_id

    if not _automation_running_lock.acquire(blocking=False):
        print(f"[Automation] Skipped ({trigger_type}): already running.")
        return {"status": "skipped", "message": "Automation job is currently running."}

    db = SessionLocal()
    start_time = datetime.utcnow()
    execution = None

    try:
        setting = get_or_create_automation_settings(db)
        requested_count = max(1, min(10, setting.articles_per_day or 5))

        # Check topics to process
        topics_to_process = select_topics_for_generation(db, setting, requested_count)

        # Create execution record in DB
        execution = AutomationExecution(
            trigger_type=trigger_type,
            status="RUNNING",
            topics_processed=topics_to_process,
            articles_requested=len(topics_to_process),
            articles_succeeded=0,
            articles_failed=0,
            started_at=start_time,
            summary_notes=f"Triggered via {trigger_type}. Strategy: {setting.topic_strategy}. Target: {len(topics_to_process)} articles."
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)
        _current_running_execution_id = execution.id

        print(f"\n========================================================")
        print(f"[Automation] Started Execution #{execution.id} ({trigger_type})")
        print(f"[Automation] Target: {len(topics_to_process)} articles | Topics: {topics_to_process}")
        print(f"========================================================\n")

        succeeded_count = 0
        failed_count = 0

        for idx, topic_name in enumerate(topics_to_process, 1):
            item_start = time.time()
            print(f"[Automation #{execution.id}] Processing ({idx}/{len(topics_to_process)}): '{topic_name}'")

            # Look for category in article_topics
            matched_cat = "Business & Investment"
            top_record = db.query(ArticleTopic).filter(ArticleTopic.name.ilike(topic_name.strip())).first()
            if top_record and top_record.category:
                matched_cat = top_record.category

            exec_item = AutomationExecutionItem(
                execution_id=execution.id,
                topic_title=topic_name,
                category=matched_cat,
                status="PENDING",
                created_at=datetime.utcnow()
            )
            db.add(exec_item)
            db.commit()
            db.refresh(exec_item)

            try:
                # 1. Create Topic in DB
                topic = Topic(
                    title=topic_name,
                    category=matched_cat,
                    user_prompt=f"Generate an in-depth editorial news article regarding {topic_name}. Audience: {setting.target_audience}. Style: {setting.writing_style}.",
                    status="RESEARCHING"
                )
                db.add(topic)
                db.flush()

                # 2. Create Article in DB
                article = GeneratedArticle(
                    topic_id=topic.id,
                    title=f"Analyzing: {topic_name}",
                    user_prompt=topic.user_prompt,
                    content="",
                    category=matched_cat,
                    status=ArticleStatus.RESEARCHING,
                    generation_step="discovering",
                    generated_at=datetime.utcnow()
                )
                db.add(article)
                db.commit()
                db.refresh(article)

                # Link item to article
                exec_item.article_id = article.id
                db.commit()

                # Record quota usage
                record_article_generation(db)

                # 3. Generate article through pipeline
                generated = generate_article_for_topic(db, topic, article)

                if generated and generated.status == ArticleStatus.READY:
                    # Optional: Auto-publish to WordPress if enabled in settings
                    if setting.direct_publish_wp and setting.wp_url and setting.wp_username and setting.wp_app_password:
                        try:
                            print(f"[Automation] Publishing Article #{article.id} directly to WordPress...")
                            publish_res = publish_to_wordpress(
                                db=db,
                                article=generated,
                                wp_url=setting.wp_url,
                                username=setting.wp_username,
                                app_password=setting.wp_app_password,
                                status="publish",
                                category_id=setting.wp_category_id,
                                author_id=setting.wp_author_id
                            )
                            if publish_res.get("success"):
                                print(f"[Automation] Article #{article.id} published to WordPress: Post #{publish_res.get('post_id')}")
                        except Exception as wp_err:
                            print(f"[Automation] WordPress auto-publish warning: {wp_err}")

                    exec_item.status = "SUCCESS"
                    exec_item.duration_seconds = round(time.time() - item_start, 2)
                    succeeded_count += 1
                    db.commit()
                    print(f"[Automation #{execution.id}] [OK] Successfully generated: '{article.title}' ({exec_item.duration_seconds}s)")
                else:
                    err_detail = article.error_message or "Article pipeline returned incomplete state."
                    exec_item.status = "FAILED"
                    exec_item.error_message = scrub_sensitive_info(err_detail)
                    exec_item.duration_seconds = round(time.time() - item_start, 2)
                    failed_count += 1
                    db.commit()
                    print(f"[Automation #{execution.id}] [FAIL] Failed generating '{topic_name}': {err_detail}")

            except Exception as item_err:
                err_str = scrub_sensitive_info(str(item_err))
                print(f"[Automation #{execution.id}] Exception processing topic '{topic_name}': {err_str}")
                exec_item.status = "FAILED"
                exec_item.error_message = err_str
                exec_item.duration_seconds = round(time.time() - item_start, 2)
                failed_count += 1
                db.commit()

            # Small pause between generation items to respect LLM API RPM
            if idx < len(topics_to_process):
                time.sleep(3.0)

        # Finalize execution record
        end_time = datetime.utcnow()
        duration_total = (end_time - start_time).total_seconds()

        if failed_count == 0 and succeeded_count > 0:
            final_status = "SUCCESS"
        elif succeeded_count > 0 and failed_count > 0:
            final_status = "PARTIAL_SUCCESS"
        else:
            final_status = "FAILED"

        execution.status = final_status
        execution.articles_succeeded = succeeded_count
        execution.articles_failed = failed_count
        execution.completed_at = end_time
        execution.duration_seconds = round(duration_total, 2)
        execution.summary_notes = f"Completed in {duration_total:.1f}s. {succeeded_count} succeeded, {failed_count} failed."
        db.commit()

        print(f"\n========================================================")
        print(f"[Automation] Execution #{execution.id} finished: {final_status}")
        print(f"[Automation] Succeeded: {succeeded_count} | Failed: {failed_count} | Duration: {duration_total:.1f}s")
        print(f"========================================================\n")

        return {
            "status": final_status,
            "execution_id": execution.id,
            "succeeded": succeeded_count,
            "failed": failed_count,
            "duration": round(duration_total, 2)
        }

    except Exception as e:
        err_str = scrub_sensitive_info(str(e))
        print(f"[Automation] Catastrophic failure in execution: {err_str}")
        if execution:
            execution.status = "FAILED"
            execution.error_message = err_str
            execution.completed_at = datetime.utcnow()
            execution.duration_seconds = round((datetime.utcnow() - start_time).total_seconds(), 2)
            db.commit()
        return {"status": "FAILED", "error": err_str}
    finally:
        _current_running_execution_id = None
        _automation_running_lock.release()
        db.close()


def run_now_async() -> Dict[str, Any]:
    """
    Triggers execution immediately in background thread.
    """
    if _automation_running_lock.locked():
        return {
            "status": "already_running",
            "message": "Automation execution is currently in progress."
        }

    thread = threading.Thread(target=execute_automation_pipeline, args=("MANUAL_RUN",))
    thread.daemon = True
    thread.start()
    return {
        "status": "started",
        "message": "Automation triggered successfully. Generating articles in background."
    }


def get_scheduler_status() -> Dict[str, Any]:
    """
    Returns live scheduler state, next run, last execution, and running status.
    """
    db = SessionLocal()
    try:
        setting = get_or_create_automation_settings(db)
        is_running = _automation_running_lock.locked()

        # Last execution
        last_exec = db.query(AutomationExecution).order_by(AutomationExecution.started_at.desc()).first()
        last_run_str = last_exec.started_at.strftime("%Y-%m-%d %H:%M:%S UTC") if last_exec else "Never"
        last_status = last_exec.status if last_exec else "None"

        # Next run
        next_dt = calculate_next_run(setting)
        next_run_str = next_dt.strftime("%Y-%m-%d %H:%M:%S") + f" ({setting.timezone})" if next_dt else "Disabled / Paused"

        # Today's counts
        today_start = datetime.combine(date.today(), datetime.min.time())
        articles_today_success = db.query(GeneratedArticle).filter(
            GeneratedArticle.generated_at >= today_start,
            GeneratedArticle.status.in_([ArticleStatus.READY, ArticleStatus.PUBLISHED, ArticleStatus.WORDPRESS_SYNCED])
        ).count()

        articles_today_failed = db.query(GeneratedArticle).filter(
            GeneratedArticle.generated_at >= today_start,
            GeneratedArticle.status == ArticleStatus.FAILED
        ).count()

        # Total automated articles all-time
        total_automated = db.query(AutomationExecutionItem).filter(
            AutomationExecutionItem.status == "SUCCESS"
        ).count()

        return {
            "is_enabled": setting.is_enabled,
            "status": "RUNNING" if is_running else ("ACTIVE" if setting.is_enabled else "PAUSED"),
            "is_running": is_running,
            "current_running_id": _current_running_execution_id,
            "schedule_time": f"{setting.schedule_hour:02d}:{setting.schedule_minute:02d}",
            "timezone": setting.timezone,
            "articles_per_day": setting.articles_per_day,
            "selected_topics": setting.selected_topics or [],
            "topic_strategy": setting.topic_strategy,
            "next_run": next_run_str,
            "last_run": last_run_str,
            "last_status": last_status,
            "today_success": articles_today_success,
            "today_failed": articles_today_failed,
            "total_automated_articles": total_automated
        }
    finally:
        db.close()


def reschedule_job():
    """
    Applies current database settings to the running APScheduler job.
    """
    global _scheduler
    if not _scheduler or not _scheduler.running:
        return

    db = SessionLocal()
    try:
        setting = get_or_create_automation_settings(db)
        job_id = "daily_article_automation"

        # Remove existing if present
        if _scheduler.get_job(job_id):
            _scheduler.remove_job(job_id)

        if setting.is_enabled:
            tz = pytz.timezone(setting.timezone or "Asia/Jakarta")
            trigger = CronTrigger(
                hour=setting.schedule_hour,
                minute=setting.schedule_minute,
                timezone=tz
            )
            _scheduler.add_job(
                execute_automation_pipeline,
                trigger=trigger,
                args=("SCHEDULED",),
                id=job_id,
                name="Inpartner Daily Article Generation",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=3600
            )
            print(f"[Scheduler] Daily job scheduled for {setting.schedule_hour:02d}:{setting.schedule_minute:02d} ({setting.timezone}).")
        else:
            print("[Scheduler] Daily automation is PAUSED in settings. No active cron job.")
    except Exception as e:
        print(f"[Scheduler] Reschedule error: {e}")
    finally:
        db.close()


def init_scheduler():
    """
    Initializes and starts APScheduler on application startup.
    """
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.start()
    print("[Scheduler] APScheduler engine started.")
    reschedule_job()
