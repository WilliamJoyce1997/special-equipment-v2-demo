#!/usr/bin/env python
"""Start the isolated local Demo. No implicit installs or migrations."""
import argparse,importlib.util,os,subprocess,sys
from pathlib import Path
BASE_DIR=Path(__file__).resolve().parent

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=8010)
    parser.add_argument("--db",default=str(BASE_DIR/".local"/"demo.sqlite3"))
    parser.add_argument("--prepare-demo",action="store_true",help="Explicitly migrate/seed only the isolated fictional Demo DB")
    parser.add_argument("--show-accounts",action="store_true",help="Display private Demo credentials in your local terminal")
    args=parser.parse_args()
    os.chdir(BASE_DIR)
    if sys.version_info<(3,10):raise SystemExit("Python 3.10+ is required")
    db=Path(args.db).resolve()
    if db in {(BASE_DIR/"db.sqlite3").resolve(),Path("D:/Projects/OpenCMMS/db.sqlite3").resolve()}:raise SystemExit("Refusing to use original/tracked database")
    os.environ["CMMS_DB_PATH"]=str(db);os.environ["CMMS_DEMO_MODE"]="1"
    missing=[name for name in ["django","rest_framework","rest_framework_simplejwt","django_filters","django_celery_beat","corsheaders","celery","openpyxl","dateutil"] if importlib.util.find_spec(name) is None]
    if missing:raise SystemExit("Missing dependencies: "+", ".join(missing)+". Install explicitly with python -m pip install -r requirements.txt")
    if args.show_accounts:
        file=BASE_DIR/".local"/"demo-accounts.json"
        if not file.exists():raise SystemExit("No credentials yet; run --prepare-demo first")
        print(file.read_text(encoding="utf-8"));return
    if args.prepare_demo:
        if db!=(BASE_DIR/".local"/"demo.sqlite3").resolve():raise SystemExit("--prepare-demo only allows .local/demo.sqlite3")
        subprocess.run([sys.executable,"-B","manage.py","migrate","--noinput"],check=True)
        subprocess.run([sys.executable,"-B","manage.py","seed_special_equipment_demo"],check=True)
    if not db.exists():raise SystemExit("Demo DB missing. Run: python start.py --prepare-demo")
    print(f"Isolated fictional Demo: http://127.0.0.1:{args.port}/static/login.html",flush=True)
    subprocess.run([sys.executable,"-B","manage.py","runserver",f"127.0.0.1:{args.port}","--noreload"],check=True)
if __name__=="__main__":main()
