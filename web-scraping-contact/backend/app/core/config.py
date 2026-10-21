import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of web-scraping-contact
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)
else:
    load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "Inpartner Company Contact Intelligence"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://u1zh8984_inpartner:Inpartner*@194.233.65.45:3306/u1zh8984_article?charset=utf8mb4"
    )
    
    # AI Provider
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    FALLBACK_GEMINI_MODEL: str = "gemini-3.7-flash"
    
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
    UPLOAD_DIR: Path = BASE_DIR / "backend" / "uploads"
    EXPORT_DIR: Path = BASE_DIR / "backend" / "exports"
    
    # Processing configs
    DEFAULT_BATCH_CONCURRENCY: int = 3
    DEFAULT_MAX_RETRIES: int = 2
    REQUEST_TIMEOUT_SECONDS: int = 15

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
