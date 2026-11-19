"""
Local runner for the Article Generator Engine serving 1sLabs adapter endpoints.
Disables Inpartner's automatic cron scheduler so local runs never interfere
with production Inpartner scheduling.
"""

import os
import sys

# Must be set before importing numpy/uvicorn/torch-related libs
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("ENABLE_SCHEDULER", "false")

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

from dotenv import load_dotenv

load_dotenv(os.path.join(PROJECT_DIR, ".env"), override=False)

import uvicorn


def main():
    host = os.getenv("SLABS_ENGINE_HOST", "127.0.0.1")
    port = int(os.getenv("SLABS_ENGINE_PORT", "8000"))
    print(f"Starting local 1sLabs Article Generator Engine at http://{host}:{port} (ENABLE_SCHEDULER={os.getenv('ENABLE_SCHEDULER')})")
    uvicorn.run("api.main:app", host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()

