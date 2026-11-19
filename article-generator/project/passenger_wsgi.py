import os
import sys
import time
import threading

# Prevent native BLAS/OpenMP thread explosion on CloudLinux shared hosting (RLIMIT_NPROC protection)
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("ENABLE_SCHEDULER", "false")

project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(project_dir, ".env"), override=True)

from a2wsgi import ASGIMiddleware
from database import engine
from api.main import app as fastapi_app, init_application_state

# Per-worker-PID singleton to survive LiteSpeed lswsgi prefork (os.fork) while preventing per-request thread leaks
_wsgi_app = None
_wsgi_pid = None
_init_lock = threading.Lock()
_MARKER_FILE = "/tmp/inpartner_app_init.done" if os.path.isdir("/tmp") else os.path.join(project_dir, "tmp", "app_init.done")


def _ensure_global_init_once():
    try:
        if os.path.exists(_MARKER_FILE) and (time.time() - os.path.getmtime(_MARKER_FILE) < 86400):
            return
        with open(_MARKER_FILE, "w") as f:
            f.write(str(int(time.time())))
        init_application_state()
    except Exception:
        pass


def _get_wsgi_app():
    global _wsgi_app, _wsgi_pid
    current_pid = os.getpid()
    if _wsgi_app is None or _wsgi_pid != current_pid:
        with _init_lock:
            if _wsgi_app is None or _wsgi_pid != current_pid:
                try:
                    engine.dispose()
                except Exception:
                    pass
                _wsgi_app = ASGIMiddleware(fastapi_app)
                _wsgi_pid = current_pid
                threading.Thread(target=_ensure_global_init_once, daemon=True).start()
    return _wsgi_app


def application(environ, start_response):
    script_name = environ.get("SCRIPT_NAME", "")
    path_info = environ.get("PATH_INFO", "")

    if script_name == "/inpartner" and path_info.startswith("/inpartner"):
        environ["PATH_INFO"] = path_info[len("/inpartner"):] or "/"
    environ["SCRIPT_NAME"] = ""

    wsgi_handler = _get_wsgi_app()
    return wsgi_handler(environ, start_response)
