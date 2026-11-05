"""Idempotent fictional data only; never seeds the legacy/development database."""
import json,secrets,os
from pathlib import Path
from datetime import timedelta
from django.core.management.base import BaseCommand,CommandError
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from users.models import Organization,Membership,User
from assets.models import Asset,AssetServiceAuthorization,DemoAdmissionProfile
from assets.services import event
from inspections.models import InspectionTemplate
from spareparts.models import SparePart
class Command(BaseCommand):
    help="Create fictional P0 demo; write credentials only to a local ignored file."
    def add_arguments(self,parser):parser.add_argument("--credentials-file",default=str(settings.BASE_DIR/".local"/"demo-accounts.json"))
    @transaction.atomic
    def handle(self,*args,**options):
        db=Path(settings.DATABASES["default"]["NAME"]).resolve()
        if db!=(settings.BASE_DIR/".local"/"demo.sqlite3").resolve() or os.environ.get("CMMS_DEMO_MODE")!="1":raise CommandError("Seed is restricted to .local/demo.sqlite3 with CMMS_DEMO_MODE=1")
        if Asset.objects.filter(is_demo=False).exists():raise CommandError("Demo database contains non-fictional assets; refusing to seed")
        creds=Path(options["credentials_file"]).resolve()
        if settings.BASE_DIR/".local" not in creds.parents:raise CommandError("Credentials must stay in this worktree's .local directory")
        existing=json.loads(creds.read_text(encoding="utf-8")) if creds.exists() else {}
        def org(code,name,cap):
            o,_=Organization.objects.get_or_create(code=code,defaults={"name":name,"capabilities":cap,"is_demo":True})
            if not o.is_demo:raise CommandError("Existing organization is not a demo")
            return o
        a=org("DEMO-A","演示星桥园区运营单位A",["using"]);b=org("DEMO-B","演示云岚运营单位B",["using"]);m=org("DEMO-C","演示恒护维护单位C",["maintenance"]);r=org("DEMO-D","演示迅修维修单位D",["repair"])
        def account(name,full,unit,role,platform=False):
            u,created=User.objects.get_or_create(username=name,defaults={"full_name":full,"role":"admin" if platform else "operator","is_staff":platform,"is_superuser":platform})
            if created:
                password=secrets.token_urlsafe(18);u.set_password(password);u.save();existing[name]={"username":name,"password":password,"name":full,"organization":unit.name,"business_role":role}
            elif name not in existing:raise CommandError("Credentials file missing for existing demo user; explicit password recovery is required")
            Membership.objects.get_or_create(user=u,organization=unit,business_role=role)
            return u
        manager=account("demo_manager","演示使用单位主管",a,"manager")
        operator=account("demo_operator","演示点检员",a,"operator")
        maint=account("demo_maintenance","演示维护员",m,"technician")
        repair=account("demo_repair","演示维修员",r,"technician")
        observer=account("demo_other","演示其他使用单位主管",b,"manager")
        account("demo_admin","演示平台管理员",a,"manager",True)
        DemoAdmissionProfile.objects.get_or_create(organization=a,version="P0-demo-v1",defaults={"confirmed_by":manager,"confirmed_at":timezone.now(),"conditions":{"fictional_only":True,"notice":"演示条件确认，仅虚构样本；未审核法定适用性"},"is_active":True})
        for code,name,unit,person in [("DEMO-SE-EL-001","演示星桥一号电梯",a,manager),("DEMO-SE-OTHER-001","演示云岚隔离电梯",b,observer)]:
            asset,created=Asset.objects.get_or_create(code=code,defaults={"name":name,"using_organization":unit,"responsible_person":person,"created_by":person,"equipment_category":"elevator","model":"DEMO-LIFT-01","specification":"虚构设备参数，仅作演示","installation_location":"演示园区A栋1号井道" if unit==a else "演示园区B栋","is_demo":True,"status":"inactive","lifecycle_stage":"registered","last_examination_date":timezone.localdate()-timedelta(days=60),"next_examination_date":timezone.localdate()+timedelta(days=10)})
            if not asset.is_demo or asset.using_organization!=unit:raise CommandError("Demo asset code collision")
            if created:event(asset,person,unit,"registered",asset,"created","虚构示例设备建档")
            if unit==a:
                for service,kind in [(m,"maintenance"),(r,"repair")]:AssetServiceAuthorization.objects.get_or_create(asset=asset,service_org=service,service_kind=kind)
        InspectionTemplate.objects.get_or_create(code="DEMO-ELEVATOR-DAILY",defaults={"name":"电梯日常观察Demo","organization":a,"equipment_type":"elevator","items_template":[{"item_code":"door","name":"门区观察","required":True,"severity":"blocking","blocks_release":True},{"item_code":"noise","name":"运行异响观察","required":True,"severity":"blocking","blocks_release":True},{"item_code":"sign","name":"标识完整性","required":True,"severity":"warning","blocks_release":False}]})
        SparePart.objects.get_or_create(part_code="DEMO-PART-001",defaults={"name":"虚构门轮","unit":"件","owning_organization":a,"created_by":manager,"min_stock":2,"safety_stock":5,"current_stock":0,"unit_cost":10})
        creds.parent.mkdir(exist_ok=True);creds.write_text(json.dumps(existing,ensure_ascii=False,indent=2),encoding="utf-8")
        try:creds.chmod(0o600)
        except OSError:pass
        self.stdout.write("Fictional demo ready. Credentials saved locally: "+str(creds)+" (passwords not printed).")
