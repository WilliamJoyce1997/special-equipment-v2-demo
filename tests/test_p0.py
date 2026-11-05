import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from users.models import Organization, Membership, User
from assets.models import Asset, AssetServiceAuthorization, DemoAdmissionProfile, LifecycleEvent
from inspections.models import InspectionTemplate, InspectionTask, InspectionRecord, InspectionIssue
from workorders.models import WorkOrder
from spareparts.models import SparePart, PartTransaction
pytestmark=pytest.mark.django_db

@pytest.fixture
def w():
    a=Organization.objects.create(code="A",name="虚构使用A",capabilities=["using"],is_demo=True)
    b=Organization.objects.create(code="B",name="虚构使用B",capabilities=["using"],is_demo=True)
    s=Organization.objects.create(code="S",name="虚构维修S",capabilities=["maintenance","repair"],is_demo=True)
    def make(name,org,role):
        u=User.objects.create_user(username=name,password="ExampleOnly_Secret1!",role="operator")
        Membership.objects.create(user=u,organization=org,business_role=role);return u
    manager=make("manager",a,"manager");op=make("operator",a,"operator");tech=make("tech",s,"technician");other=make("other",b,"manager")
    asset=Asset.objects.create(code="DEMO-SE-TEST",name="虚构电梯",equipment_category="elevator",using_organization=a,responsible_person=manager,created_by=manager,is_demo=True,lifecycle_stage="registered",status="inactive")
    hidden=Asset.objects.create(code="HIDDEN",name="private",using_organization=b,created_by=other)
    for kind in ["maintenance","repair"]:AssetServiceAuthorization.objects.create(asset=asset,service_org=s,service_kind=kind)
    DemoAdmissionProfile.objects.create(organization=a,version="demo-v1",confirmed_by=manager,confirmed_at=timezone.now(),conditions={"fictional_only":True},is_active=True)
    c=APIClient()
    def login(u):
        c.force_authenticate(u);c.credentials(HTTP_X_ORGANIZATION_ID=str(a.pk if u in [manager,op] else s.pk if u==tech else b.pk));return c
    return locals()

def test_scope(w):
    c=w["login"](w["manager"])
    assert [x["id"] for x in c.get("/api/assets/").data["results"]]==[w["asset"].pk]
    assert c.get(f'/api/assets/{w["hidden"].pk}/').status_code==404
    assert c.post("/api/workorders/",{"equipment":w["hidden"].pk,"summary":"illegal"},format="json").status_code==400
    c.credentials(HTTP_X_ORGANIZATION_ID=str(w["b"].pk));assert c.get("/api/assets/").status_code==403

def test_admission(w):
    c=w["login"](w["manager"]);a=w["asset"]
    assert c.patch(f"/api/assets/{a.pk}/",{"status":"active"},format="json").status_code==400
    for action in ["request_admission","confirm_admission"]:
        r=c.post(f"/api/assets/{a.pk}/state-transitions/",{"action":action,"reason":"模拟确认","version":a.version},format="json")
        assert r.status_code==200,r.data;a.refresh_from_db()
    assert a.status=="active"
    assert LifecycleEvent.objects.filter(asset=a,event_type="state_change").count()==2

def test_repair(w):
    c=w["login"](w["manager"]);a=w["asset"]
    r=c.post("/api/workorders/",{"equipment":a.pk,"summary":"虚构维修","wo_type":"CM"},format="json");assert r.status_code==201,r.data;wid=r.data["id"]
    assert c.patch(f"/api/workorders/{wid}/",{"status":"closed"},format="json").status_code==400
    assert c.post(f"/api/workorders/{wid}/assign/",{"service_org":w["s"].pk,"assignee_id":w["tech"].pk},format="json").status_code==200
    c=w["login"](w["tech"]);assert c.post(f"/api/workorders/{wid}/start/",{},format="json").status_code==409
    for action,data in [("accept",{}),("start",{}),("complete",{"actions_taken":"模拟修复","labor_hours":"1.5"})]:
        r=c.post(f"/api/workorders/{wid}/{action}/",data,format="json");assert r.status_code==200,r.data
    assert c.post(f"/api/workorders/{wid}/close/",{},format="json").status_code==403
    c=w["login"](w["manager"]);assert c.post(f"/api/workorders/{wid}/close/",{},format="json").status_code==200
    a.refresh_from_db();assert a.status!="active"

def test_check_and_issue(w):
    c=w["login"](w["manager"]);a=w["asset"]
    t=InspectionTemplate.objects.create(code="TEMP",name="虚构点检",items_template=[{"item_code":"door","name":"门区","required":True,"severity":"blocking","blocks_release":True}],organization=w["a"])
    r=c.post("/api/inspections/plans/",{"code":"PLAN","title":"日检","equipment":a.pk,"template":t.pk,"executor":w["op"].pk,"frequency_days":1,"start_date":str(timezone.localdate())},format="json");assert r.status_code==201,r.data
    for _ in range(2):assert c.post(f'/api/inspections/plans/{r.data["id"]}/generate_tasks/',{},format="json").status_code==200
    assert InspectionTask.objects.count()==1;task=InspectionTask.objects.get();c=w["login"](w["op"])
    assert c.post("/api/inspections/",{"task":task.pk,"items":[]},format="json").status_code==400
    payload={"task":task.pk,"items":[{"item_code":"door","result":"abnormal","note":"模拟异常"}],"performed_at":timezone.now().isoformat(),"idempotency_key":"once"}
    r=c.post("/api/inspections/",payload,format="json");assert r.status_code==201,r.data;rid=r.data["id"]
    assert c.post("/api/inspections/",payload,format="json").status_code==200;assert InspectionRecord.objects.count()==1
    for _ in range(2):assert c.post(f"/api/inspections/{rid}/report_issue/",{},format="json").status_code==200
    assert WorkOrder.objects.count()==1;a.refresh_from_db();assert a.lifecycle_stage=="suspended"
    issue=InspectionIssue.objects.get();c=w["login"](w["manager"])
    assert c.post(f"/api/assets/{a.pk}/state-transitions/",{"action":"request_admission","reason":"too soon"},format="json").status_code==409
    assert c.post(f"/api/inspections/issues/{issue.pk}/verify_resolution/",{"resolution_note":"not repaired"},format="json").status_code==409

def test_inventory(w):
    c=w["login"](w["manager"])
    p=SparePart.objects.create(part_code="PART",name="虚构门轮",owning_organization=w["a"],created_by=w["manager"],current_stock=5,min_stock=1,safety_stock=2,unit_cost=2)
    for q in ["-1","bad","NaN","0","999999999999"]:assert c.post(f"/api/spareparts/{p.pk}/stock_out/",{"quantity":q},format="json").status_code==400
    r=c.post(f"/api/spareparts/{p.pk}/stock_out/",{"quantity":"2"},format="json");assert r.status_code==200,r.data
    p.refresh_from_db();assert p.current_stock==Decimal("3")
    tr=PartTransaction.objects.get();assert tr.stock_before==5 and tr.stock_after==3 and tr.operator==w["manager"]
    assert c.post(f"/api/spareparts/{p.pk}/stock_out/",{"quantity":"4"},format="json").status_code==409;assert PartTransaction.objects.count()==1
    c=w["login"](w["other"]);assert c.get(f"/api/spareparts/{p.pk}/").status_code==404

def test_report(w):
    c=w["login"](w["manager"])
    for i in range(25):WorkOrder.objects.create(equipment=w["asset"],requesting_org=w["a"],summary=str(i),requested_by=w["manager"],status="open",wo_type="CM")
    r=c.get("/api/reports/overview/");assert r.status_code==200,r.data
    assert r.data["assets"]["total"]==1 and r.data["workorders"]["pending"]==25
    assert r.data["inspections"]["completion_rate"] is None
    assert r.data["examinations"]["unknown"]==1 and r.data["examinations"]["results_available"] is False
