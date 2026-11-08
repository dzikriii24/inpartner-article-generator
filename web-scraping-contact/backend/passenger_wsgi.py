import os
import sys
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from dotenv import load_dotenv
env_file = os.path.join(CURRENT_DIR, ".env")
if os.path.exists(env_file):
    load_dotenv(env_file, override=True)

_wsgi_app = None

def get_wsgi_app():
    global _wsgi_app
    if _wsgi_app is None:
        from a2wsgi import ASGIMiddleware
        from app.main import app as fastapi_app
        _wsgi_app = ASGIMiddleware(fastapi_app)
    return _wsgi_app

def application(environ, start_response):
    log_path = os.path.join(CURRENT_DIR, "request.log")
    try:
        script_name = environ.get('SCRIPT_NAME', '')
        path_info = environ.get('PATH_INFO', '')

        with open(log_path, "a") as f:
            f.write(f"REQ: method={environ.get('REQUEST_METHOD')} script={script_name} path={path_info}\n")

        # When mounted under /api, adjust PATH_INFO so FastAPI matches /api/...
        if script_name and not path_info.startswith(script_name):
            environ['PATH_INFO'] = script_name.rstrip('/') + '/' + path_info.lstrip('/')
            environ['SCRIPT_NAME'] = ''

        app_instance = get_wsgi_app()
        return app_instance(environ, start_response)
    except Exception as e:
        error_trace = traceback.format_exc()
        try:
            with open(log_path, "a") as f:
                f.write(f"ERR: {error_trace}\n")
        except Exception:
            pass
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain; charset=utf-8')])
        return [f"WSGI Error:\n{error_trace}".encode('utf-8')]
