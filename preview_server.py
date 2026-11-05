"""Local-only Waitress backend for the exact configured Quick Tunnel hostname."""
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parent
os.environ["DJANGO_SETTINGS_MODULE"]="cmms_project.preview_settings"
os.environ["CMMS_DB_PATH"]=str(ROOT/".local"/"demo.sqlite3")
os.environ["CMMS_DEMO_MODE"]="1"
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from waitress import serve

django_app=get_wsgi_application()
static_app=WhiteNoise(django_app,root=str(ROOT/"static"),prefix="static/",autorefresh=False)
allowed={"/static/login.html","/static/index.html","/static/css/common.css"}
allowed.update("/static/js/"+x for x in ["api.js","ui.js","assets.js","workorders.js","maintenance.js","inspections.js","spareparts.js","reports.js","index.js"])
def application(environ,start_response):
    host=environ.get("HTTP_HOST","").lower().split(":",1)[0]
    if host not in {"127.0.0.1","localhost","contrast-prefix-from-increasing.trycloudflare.com"}:
        start_response("400 Bad Request",[("Content-Type","text/plain; charset=utf-8")])
        return [b"Bad Request"]
    path=environ.get("PATH_INFO","")
    if path.startswith("/static/") and path not in allowed:
        start_response("404 Not Found",[("Content-Type","text/plain; charset=utf-8"),("X-Content-Type-Options","nosniff")])
        return [b"Not found"]
    return static_app(environ,start_response)
if __name__=="__main__":
    if not (ROOT/".local"/"demo.sqlite3").is_file():raise SystemExit("Isolated demo DB is missing")
    print("Restricted preview: 127.0.0.1:8010; Cloudflare hostname explicitly allowed",flush=True)
    serve(application,host="127.0.0.1",port=8010,trusted_proxy="127.0.0.1",trusted_proxy_count=1,trusted_proxy_headers={"x-forwarded-proto"},clear_untrusted_proxy_headers=True,threads=4)
