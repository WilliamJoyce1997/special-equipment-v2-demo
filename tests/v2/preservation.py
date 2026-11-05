"""Read-only verification of retained P0 source, snapshots and references."""
from pathlib import Path
import hashlib, json, sqlite3, zipfile, tempfile, shutil
from contextlib import closing
ROOT=Path(__file__).resolve().parents[2]
manifest=json.loads((ROOT/'.local/p0-preservation.json').read_text(encoding='utf-8-sig'))
SOURCE=Path(manifest['source'])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
report={'p0_source':str(SOURCE),'v2':str(ROOT),'v2_has_git_metadata':(ROOT/'.git').exists()}
with zipfile.ZipFile(ROOT/'.local/p0-code-snapshot.zip') as z:
 report['zip_crc_ok']=z.testzip() is None
 report['snapshot_entries']=len(z.namelist())
 report['p0_source_changes_since_snapshot']=[n for n in z.namelist() if not (SOURCE/n).is_file() or hashlib.sha256(z.read(n)).hexdigest()!=sha(SOURCE/n)]
reference_root=ROOT/'docs/references/special-equipment-ui'
archive_pointer=reference_root/'archive-manifest.json'
if archive_pointer.exists():reference_root=Path(json.loads(archive_pointer.read_text(encoding='utf-8-sig'))['archive_directory'])
report['reference_count']=len(list(reference_root.glob('*.png')))
report['reference_hashes_ok']=all(sha(reference_root/r['saved'])==r['sha256'] for r in manifest['references'])
report['p0_demo_unchanged']=sha(SOURCE/'.local/demo.sqlite3')==manifest['source_demo_sha256']
report['v2_demo_matches_snapshot']=sha(ROOT/'.local/demo.sqlite3')==sha(ROOT/'.local/p0-demo-snapshot.sqlite3')
report['databases']={}
for name in ['demo.sqlite3','p0-demo-snapshot.sqlite3']:
 with closing(sqlite3.connect((ROOT/'.local'/name).as_uri()+'?mode=ro',uri=True)) as db:
  report['databases'][name]={'integrity':db.execute('pragma integrity_check').fetchone()[0],'foreign_key_errors':len(db.execute('pragma foreign_key_check').fetchall()),'table_count':db.execute("select count(*) from sqlite_master where type='table'").fetchone()[0]}
# Recover into a temporary, physically separate file then validate it without altering either snapshot.
with tempfile.TemporaryDirectory(prefix='cmms-v2-restore-') as task_dir:
 restored=Path(task_dir)/'restored.sqlite3'
 shutil.copy2(ROOT/'.local/p0-demo-snapshot.sqlite3',restored)
 with closing(sqlite3.connect(restored.as_uri()+'?mode=ro',uri=True)) as db:
  report['restore_integrity']=db.execute('pragma integrity_check').fetchone()[0]
report['original_database_sha256']=sha(Path('D:/Projects/OpenCMMS/db.sqlite3'))
(ROOT/'docs/special-equipment-v2/preservation-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
assert report['zip_crc_ok'] and not report['p0_source_changes_since_snapshot']
assert report['reference_count']==16 and report['reference_hashes_ok']
assert report['p0_demo_unchanged'] and report['v2_demo_matches_snapshot']
assert all(v['integrity']=='ok' and v['foreign_key_errors']==0 for v in report['databases'].values())
assert report['restore_integrity']=='ok' and not report['v2_has_git_metadata']
print(json.dumps(report,ensure_ascii=False,indent=2))

