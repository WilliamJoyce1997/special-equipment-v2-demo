"""Only used in the independent V2 copy, no P0 configuration changes."""
import os
from pathlib import Path
os.environ["CMMS_DB_PATH"] = str(Path(__file__).resolve().parent.parent / ".local" / "demo.sqlite3")
os.environ["CMMS_DEMO_MODE"] = "1"
from .settings import *
DEBUG = False
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
ROOT_URLCONF = "cmms_project.v2_urls"
SECURE_PROXY_SSL_HEADER = None
SESSION_COOKIE_SECURE = False  # HTTP loopback only, no sessions used by V2 fixture UI.
CSRF_COOKIE_SECURE = False

