import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
BASE_DIR = BACKEND_DIR.parent

ENV_PATH = BACKEND_DIR / ".env"
if not ENV_PATH.exists():
    ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)
else:
    load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "Inpartner Company Contact Intelligence"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://u1zh8984_inpartner:Inpartner*@194.233.65.45:3306/u1zh8984_article?charset=utf8mb4"
    )
    
    # AI Provider — use active valid Gemini model names (Gemini 2.0 retired by Google in 2026)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_GEMINI_MODEL: str = os.getenv("DEFAULT_GEMINI_MODEL", "gemini-3.5-flash-lite")
    FALLBACK_GEMINI_MODEL: str = os.getenv("FALLBACK_GEMINI_MODEL", "gemini-3.8-flash")
    
    # Server & CORS
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8002"))
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv(
            "CORS_ORIGINS", 
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8002"
        ).split(",") if origin.strip()
    ]
    
    # Storage paths
    UPLOAD_DIR: Path = BACKEND_DIR / "uploads"
    EXPORT_DIR: Path = BACKEND_DIR / "exports"
    
    # Processing configs (conservative for CloudLinux shared hosting)
    DEFAULT_BATCH_CONCURRENCY: int = 1
    DEFAULT_MAX_RETRIES: int = 2
    REQUEST_TIMEOUT_SECONDS: int = 10
    
    # Search provider timeouts
    SEARCH_CONNECT_TIMEOUT: float = 3.0
    SEARCH_READ_TIMEOUT: float = 8.0
    PAGE_FETCH_TIMEOUT: float = 6.0
    
    # Discovery settings
    MAX_LEADERSHIP_PAGES: int = 8
    MAX_SEARCH_QUERIES: int = 5
    MAX_ARTICLE_FETCHES: int = 2
    
    # Cache TTL (seconds)
    CACHE_TTL_COMPANY: int = 3600  # 1 hour
    CACHE_TTL_SEARCH: int = 1800   # 30 minutes

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
