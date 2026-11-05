import pytest
from django.utils import timezone
from datetime import timedelta
from tests.test_p0 import w
from users.models import Membership
from workorders.models import WorkOrder
from assets.models import Asset,AssetServiceAuthorization
pytestmark=pytest.mark.django_db

def test_provider_manager_cannot_use_display_serializer_to_write(w):
    Membership.objects.create(user=w["tech"],organization=w["s"],business_role="manager")
    c=w["login"](w["tech"])
    r=c.post("/api/assets/",{"code":"NOT-DEMO","name":"forbidden","is_demo":True,"status":"active"},format="json")
    assert r.status_code==400,r.data
    assert not Asset.objects.filter(code="NOT-DEMO").exists()

def test_revoking_repair_does_not_allow_read_via_maintenance_authorization(w):
    a=w["asset"];wo=WorkOrder.objects.create(equipment=a,service_org=w["s"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional",wo_type="CM")
    c=w["login"](w["tech"]);assert c.get(f"/api/workorders/{wo.pk}/").status_code==200
    AssetServiceAuthorization.objects.filter(asset=a,service_org=w["s"],service_kind="repair").update(is_active=False)
    assert c.get(f"/api/workorders/{wo.pk}/").status_code==404
    assert c.get("/api/workorders/comments/",{"work_order":wo.pk}).data["count"]==0

def test_completion_maintains_total_cost(w):
    a=w["asset"];wo=WorkOrder.objects.create(equipment=a,service_org=w["s"],assignee=w["tech"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional",wo_type="CM",status="in_progress",accepted_at=timezone.now())
    c=w["login"](w["tech"])
    r=c.post(f"/api/workorders/{wo.pk}/complete/",{"actions_taken":"Fictional repair","parts_cost":"50.00"},format="json")
    assert r.status_code==200,r.data
    wo.refresh_from_db();assert wo.total_cost==wo.parts_cost==50

def test_authorization_api_supports_revocation_and_expiry(w):
    a=w["asset"];c=w["login"](w["manager"]);url=f"/api/assets/{a.pk}/service_authorizations/"
    r=c.post(url,{"service_org":w["s"].pk,"service_kind":"repair","is_active":False},format="json");assert r.status_code==200
    auth=AssetServiceAuthorization.objects.get(asset=a,service_org=w["s"],service_kind="repair");assert not auth.is_active
    day=timezone.localdate()-timedelta(days=1)
    assert c.post(url,{"service_org":w["s"].pk,"service_kind":"repair","is_active":True,"valid_until":str(day)},format="json").status_code==200
    auth.refresh_from_db();assert auth.valid_until==day
    assert c.post(url,{"service_org":w["s"].pk,"service_kind":"repair","valid_from":"2030-01-02","valid_until":"2030-01-01"},format="json").status_code==400
