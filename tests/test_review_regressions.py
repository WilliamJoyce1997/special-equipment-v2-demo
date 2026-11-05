import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from tests.test_p0 import w
from users.models import Membership
from workorders.models import WorkOrder
from inspections.models import InspectionPlan,InspectionTask,InspectionTemplate
pytestmark=pytest.mark.django_db

def test_overdue_uses_external_asset_serializer(w):
    a=w["asset"];a.notes="PRIVATE-OWNER-NOTES";a.asset_value=123;a.next_maintenance_date=timezone.localdate()-timedelta(days=1);a.save()
    WorkOrder.objects.create(equipment=a,service_org=w["s"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional")
    r=w["login"](w["tech"]).get("/api/assets/overdue/")
    assert r.status_code==200
    assert "notes" not in r.data[0] and "asset_value" not in r.data[0]

def test_workorder_csv_import_maps_without_mutating_iterator(w):
    c=w["login"](w["manager"])
    f=SimpleUploadedFile("orders.csv",("equipment_code,summary,wo_type\n"+w["asset"].code+",Fictional import,CM\n").encode("utf-8"),content_type="text/csv")
    r=c.post("/api/workorders/import_excel/",{"file":f},format="multipart")
    assert r.status_code==200,r.data
    assert r.data["success_count"]==1

def test_internal_comment_not_leaked_by_owner_timeline(w):
    a=w["asset"];order=WorkOrder.objects.create(equipment=a,service_org=w["s"],assignee=w["tech"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional",status="in_progress")
    c=w["login"](w["tech"])
    assert c.post("/api/workorders/comments/",{"work_order":order.pk,"comment":"SECRET-PROVIDER-DETAIL","is_internal":True},format="json").status_code==201
    r=w["login"](w["manager"]).get(f"/api/assets/{a.pk}/timeline/")
    assert "SECRET-PROVIDER-DETAIL" not in str(r.data)

def test_existing_task_keeps_executor_after_plan_reassignment(w):
    t=InspectionTemplate.objects.create(code="REASSIGN",name="fictional",organization=w["a"],items_template=[{"item_code":"one","name":"item","required":True}])
    plan=InspectionPlan.objects.create(code="REASSIGN",title="test",equipment=w["asset"],using_org=w["a"],template=t,executor=w["op"],start_date=timezone.localdate(),created_by=w["manager"])
    task=InspectionTask.objects.create(plan=plan,scheduled_date=timezone.localdate(),due_at=timezone.now(),executor=w["op"],template_snapshot=t.items_template)
    plan.executor=w["manager"];plan.save()
    r=w["login"](w["op"]).get(f"/api/inspections/tasks/{task.pk}/")
    assert r.status_code==200,r.data
    payload={"task":task.pk,"items":[{"item_code":"one","result":"normal"}],"performed_at":timezone.now().isoformat(),"idempotency_key":"reassigned"}
    assert w["login"](w["op"]).post("/api/inspections/",payload,format="json").status_code==201
