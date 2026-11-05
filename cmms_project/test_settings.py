"""Tests always use a disposable database in the isolated workspace."""
from .settings import *
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / ".local" / "development.sqlite3", "TEST": {"NAME": BASE_DIR / ".local" / "test-p0.sqlite3"}}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
LOGGING = {"version": 1, "disable_existing_loggers": False, "handlers": {"console": {"class": "logging.StreamHandler"}}, "root": {"handlers": ["console"], "level": "ERROR"}}
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
