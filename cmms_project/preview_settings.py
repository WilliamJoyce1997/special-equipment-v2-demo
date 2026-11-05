"""Restricted HTTPS preview for the local Cloudflare Quick Tunnel."""
import os
from pathlib import Path
os.environ["CMMS_DB_PATH"]=str(Path(__file__).resolve().parent.parent/".local"/"demo.sqlite3")
os.environ["CMMS_DEMO_MODE"]="1"
from .settings import *
DEBUG=False
ALLOWED_HOSTS=["127.0.0.1","localhost","contrast-prefix-from-increasing.trycloudflare.com"]
CSRF_TRUSTED_ORIGINS=["https://contrast-prefix-from-increasing.trycloudflare.com"]
ROOT_URLCONF="cmms_project.preview_urls"
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE="Lax"
CSRF_COOKIE_SAMESITE="Lax"
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY="same-origin"
X_FRAME_OPTIONS="DENY"
# Waitress validates the local proxy and sets wsgi.url_scheme itself.
SECURE_PROXY_SSL_HEADER=None
REST_FRAMEWORK={**REST_FRAMEWORK,"DEFAULT_AUTHENTICATION_CLASSES":("cmms_project.preview_auth.PreviewJWTAuthentication",),"DEFAULT_RENDERER_CLASSES":("rest_framework.renderers.JSONRenderer",),"DEFAULT_THROTTLE_RATES":{"anon":"30/min"}}
