import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Default Paths
DEFAULT_INPUT_EXCEL = r"c:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\Pipeline AR-SR.xlsx"
DEFAULT_OUTPUT_EXCEL = os.path.join(BASE_DIR, "Pipeline AR-SR_Lengkap.xlsx")
DEFAULT_CHECKPOINT_EXCEL = os.path.join(BASE_DIR, "Pipeline AR-SR_checkpoint.xlsx")
EXPORT_DEST_EXCEL = r"c:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\Pipeline AR-SR_Lengkap.xlsx"

# Cache Files
CACHE_PROFILES_FILE = os.path.join(BASE_DIR, "all_profiles.json")
CACHE_DETAILS_FILE = os.path.join(BASE_DIR, "idx_details_cache.json")
CACHE_WEBSITE_FILE = os.path.join(BASE_DIR, "website_scrape_cache.json")

# Scraping & Matching Parameters
CHECKPOINT_INTERVAL = 25  # Save checkpoint every 25 rows
FUZZY_SCORE_CUTOFF = 75.0  # Minimum fuzzy match score (0-100)
WEB_CRAWL_TIMEOUT = 7      # Seconds timeout per website request
MAX_CRAWL_WORKERS = 10     # Concurrency for website & social media extraction
DDG_FALLBACK_ENABLED = True

# Target Excel Columns
OUTPUT_COLUMNS = [
    "No",
    "Nama Perusahaan",
    "Potensi Produk",
    "Kode Emiten",
    "Email Perusahaan",
    "No. Telepon",
    "Website",
    "Alamat",
    "Nama Corporate Secretary",
    "Sosial Media"
]
