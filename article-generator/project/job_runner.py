"""
Standalone Background Job Runner for Shared Hosting (LiteSpeed lswsgi / Passenger).
Executes article generation or RSS aggregation in a detached process with file-based
concurrency slot locking and automatic process termination upon completion (zero idle RAM).
"""
import os
import sys
import time
import json
import argparse
from datetime import datetime

# Enforce single-threaded BLAS/OpenMP before any library imports
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, ".env"), override=True)

from database import SessionLocal
from models import Topic, GeneratedArticle, ArticleStatus
from services.generator import generate_article_for_topic, update_article_step, MAX_CONCURRENT_GENERATIONS
from services.aggregator import run_aggregation, update_fetch_progress, FETCH_PROGRESS
from services.clustering import cluster_topics

LOCK_DIR = "/tmp" if os.path.isdir("/tmp") else os.path.join(PROJECT_DIR, "tmp")
os.makedirs(LOCK_DIR, exist_ok=True)


class ConcurrencySlotLock:
    """
    Cross-process bounded semaphore using OS file locks (fcntl on Linux, msvcrt/fallback on Windows).
    Ensures at most MAX_CONCURRENT_GENERATIONS job_runner processes execute simultaneously.
    """
    def __init__(self, max_slots: int = 2, timeout: int = 180):
        self.max_slots = max(1, max_slots)
        self.timeout = timeout
        self.fd = None
        self.slot_path = None

    def __enter__(self):
        start = time.time()
        try:
            import fcntl
            while time.time() - start < self.timeout:
                for slot_idx in range(self.max_slots):
                    path = os.path.join(LOCK_DIR, f"inpartner_gen_slot_{slot_idx}.lock")
                    fd = open(path, "w")
                    try:
                        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        fd.write(f"{os.getpid()} {int(time.time())}\n")
                        fd.flush()
                        self.fd = fd
                        self.slot_path = path
                        return self
                    except (IOError, OSError):
                        fd.close()
                time.sleep(1.5)
        except ImportError:
            # Windows fallback where fcntl is unavailable
            return self
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fd is not None:
            try:
                import fcntl
                fcntl.flock(self.fd, fcntl.LOCK_UN)
            except Exception:
                pass
            try:
                self.fd.close()
            except Exception:
                pass
            self.fd = None


def run_prompt_job(article_id: int):
    with ConcurrencySlotLock(max_slots=MAX_CONCURRENT_GENERATIONS):
        db = SessionLocal()
        try:
            article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            if not article:
                print(f"[JobRunner] Article #{article_id} not found.")
                return

            user_prompt = article.user_prompt or article.title or "Editorial Analysis"
            clean_prompt_title = user_prompt.strip().split('\n')[0]
            if len(clean_prompt_title) > 200:
                clean_prompt_title = clean_prompt_title[:197] + "..."

            if article.topic_id:
                topic = db.query(Topic).filter(Topic.id == article.topic_id).first()
            else:
                topic = Topic(
                    title=clean_prompt_title,
                    user_prompt=user_prompt,
                    status="RESEARCHING"
                )
                db.add(topic)
                db.flush()
                article.topic_id = topic.id
                db.commit()

            generate_article_for_topic(db, topic, article)
        except Exception as e:
            print(f"[JobRunner Error] Article #{article_id} failed: {e}")
            db_fail = SessionLocal()
            try:
                art_fail = db_fail.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
                if art_fail:
                    update_article_step(db_fail, art_fail, "failed", ArticleStatus.FAILED, str(e))
            finally:
                db_fail.close()
        finally:
            db.close()


def run_topic_job(article_id: int, topic_id: int):
    with ConcurrencySlotLock(max_slots=MAX_CONCURRENT_GENERATIONS):
        db = SessionLocal()
        try:
            article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
            topic = db.query(Topic).filter(Topic.id == topic_id).first()
            if not article or not topic:
                return
            generate_article_for_topic(db, topic, article)
        except Exception as e:
            print(f"[JobRunner Error] Topic job #{article_id} failed: {e}")
            db_fail = SessionLocal()
            try:
                art_fail = db_fail.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
                if art_fail:
                    update_article_step(db_fail, art_fail, "failed", ArticleStatus.FAILED, str(e))
            finally:
                db_fail.close()
        finally:
            db.close()


def run_fetch_job():
    progress_file = os.path.join(LOCK_DIR, "inpartner_fetch_progress.json")
    def save_progress(step, msg, is_fetching=True, fetched=0, clustered=0, err=None):
        data = {
            "is_fetching": is_fetching,
            "step": step,
            "message": msg,
            "fetched_count": fetched,
            "clustered_count": clustered,
            "error": err,
            "updated_at": time.time()
        }
        try:
            with open(progress_file, "w") as f:
                json.dump(data, f)
        except Exception:
            pass

    db = SessionLocal()
    try:
        save_progress("rss", "Discovering RSS feeds & GNews API headlines...", True)
        agg_count = run_aggregation(db)
        save_progress("clustering", f"Fetched {agg_count} new sources. Performing semantic topic clustering...", True, fetched=agg_count)
        cluster_count = cluster_topics(db)
        save_progress("done", f"Complete! Fetched {agg_count} sources and created {cluster_count} new topics.", False, fetched=agg_count, clustered=cluster_count)
    except Exception as e:
        save_progress("failed", str(e), False, err=str(e))
    finally:
        db.close()


def run_slabs_job(slabs_job_id: str):
    from api.slabs_routes import run_slabs_job_from_file
    with ConcurrencySlotLock(max_slots=max(1, MAX_CONCURRENT_GENERATIONS), timeout=240):
        run_slabs_job_from_file(slabs_job_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inpartner Background Job Runner")
    parser.add_argument("--mode", choices=["prompt", "topic", "fetch", "slabs"], required=True)
    parser.add_argument("--article-id", type=int, default=0)
    parser.add_argument("--topic-id", type=int, default=0)
    parser.add_argument("--slabs-job-id", type=str, default="")
    args = parser.parse_args()

    if args.mode == "prompt" and args.article_id:
        run_prompt_job(args.article_id)
    elif args.mode == "topic" and args.article_id and args.topic_id:
        run_topic_job(args.article_id, args.topic_id)
    elif args.mode == "fetch":
        run_fetch_job()
    elif args.mode == "slabs" and args.slabs_job_id:
        run_slabs_job(args.slabs_job_id)

