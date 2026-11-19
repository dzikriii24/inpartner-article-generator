import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError, PendingRollbackError
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(
    DATABASE_URL,
    pool_size=3,
    max_overflow=5,
    pool_timeout=20,
    pool_pre_ping=True,
    pool_recycle=60,
    connect_args={
        "connect_timeout": 15,
        "read_timeout": 30,
        "write_timeout": 30,
    }
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine
)
Base = declarative_base()


def safe_commit(db: Session, release_conn: bool = True):
    """
    Commits changes and optionally closes the session transaction so no MySQL connection
    is held idle across slow external LLM or HTTP scraping calls (prevents MySQL error 2006).
    """
    try:
        db.commit()
    except (OperationalError, PendingRollbackError) as e:
        print(f"[DB Warning] Transient commit error ({e}), rolling back and reconnecting...")
        try:
            db.rollback()
        except Exception:
            pass
        try:
            engine.dispose()
        except Exception:
            pass
        db.commit()
    finally:
        if release_conn:
            try:
                db.close()
            except Exception:
                pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
