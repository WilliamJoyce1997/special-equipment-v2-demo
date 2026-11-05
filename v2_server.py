"""V2 local-only UI preview. No business/API routes are exposed by this entry."""
import os
from pathlib import Path
ROOT = Path(__file__).resolve().parent
os.environ["DJANGO_SETTINGS_MODULE"] = "cmms_project.v2_settings"
os.environ["CMMS_DB_PATH"] = str(ROOT / ".local" / "demo.sqlite3")
os.environ["CMMS_DEMO_MODE"] = "1"
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from waitress import serve
django_app = get_wsgi_application()
# Local preview serves files that are edited while the process is running.
static_app = WhiteNoise(django_app, root=str(ROOT / "static"), prefix="static/", autorefresh=True, max_age=None)
allowed = {"/static/v2/elevator-tools.js", "/static/v2/elevator-print.html", "/static/v2/elevator-print.js", "/static/v2/elevator-print.css", "/static/v2/query-styles.css","/static/v2/query-dictionaries.js","/static/v2/query-engine.js","/static/v2/query-results.js","/static/v2/query-builder.js","/static/v2/query-plans.js","/static/v2.html", "/static/v2/config.js", "/static/v2/fixtures.js", "/static/v2/app.js", "/static/v2/safety-valve-schema.js", "/static/v2/safety-valve.js", "/static/v2/vendor/xlsx.full.min.js", "/static/v2/templates/safety-valve-import.xlsx", "/static/v2/pipe-products.js", "/static/v2/product-categories.js", "/static/v2/additional-products.js", "/static/v2/vessel-product.js", "/static/v2/boiler-product.js", "/static/v2/personnel.js", "/static/v2/inspection-unit.js", "/static/v2/more-dialogs.js", "/static/v2/inspection-history.js", "/static/v2/inspection-record-dialogs.js", "/static/v2/vendor/qrcode.js", "/static/v2/dossier.js", "/static/v2/styles.css"}
def application(environ, start_response):
    host = environ.get("HTTP_HOST", "").split(":", 1)[0].lower()
    if host not in {"localhost", "127.0.0.1"}:
        start_response("400 Bad Request", [("Content-Type", "text/plain")])
        return [b"Local preview only"]
    path = environ.get("PATH_INFO", "")
    if path == "/":
        start_response("302 Found", [("Location", "/static/v2.html"), ("Cache-Control", "no-store")])
        return [b""]
    # Exact static alias for the requested local print URL; exposes no API or business handler.
    if path == "/scdrpt/rpt_printCrt.shtml":
        environ = dict(environ, PATH_INFO="/static/v2/elevator-print.html")
        path = environ["PATH_INFO"]
    if path not in allowed:
        start_response("404 Not Found", [("Content-Type", "text/plain"), ("X-Content-Type-Options", "nosniff")])
        return [b"Not found"]
    def secure_start(status, headers, exc_info=None):
        headers.append(("Cache-Control", "no-store"))
        headers += [("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"), ("X-Content-Type-Options", "nosniff"), ("Referrer-Policy", "same-origin")]
        return start_response(status, headers, exc_info)
    return static_app(environ, secure_start)
if __name__ == "__main__":
    if not (ROOT / ".local" / "demo.sqlite3").is_file():
        raise SystemExit("V2 isolated snapshot missing; refusing to start")
    print("V2 local UI preview: http://127.0.0.1:8020 (fictional browser fixtures; no database writes)", flush=True)
    serve(application, host="127.0.0.1", port=8020, threads=4, clear_untrusted_proxy_headers=True)

