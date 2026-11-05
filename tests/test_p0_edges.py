from unittest.mock import patch
import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from tests.test_p0 import w
from users.models import Membership,User,IdempotencyReceipt
from assets.models import Asset,AssetServiceAuthorization,LifecycleEvent
from workorders.models import WorkOrder
from spareparts.models import SparePart,PartTransaction
pytestmark=pytest.mark.django_db

def test_stock_rolls_back_when_transaction_fails(w):
    p=SparePart.objects.create(part_code="ROLLBACK",name="Fictional",unit="pcs",current_stock=5,owning_organization=w["a"],created_by=w["manager"])
    c=w["login"](w["manager"])
    with patch("spareparts.services.PartTransaction.objects.create",side_effect=RuntimeError("simulated storage failure")):
        with pytest.raises(RuntimeError):c.post(f"/api/spareparts/{p.pk}/stock_out/",{"quantity":"1"},format="json")
    p.refresh_from_db();assert p.current_stock==5;assert not PartTransaction.objects.exists()

def test_stock_idempotence(w):
    p=SparePart.objects.create(part_code="IDEMP",name="Fictional",unit="pcs",current_stock=0,owning_organization=w["a"],created_by=w["manager"])
    c=w["login"](w["manager"]);data={"quantity":"3","idempotency_key":"same"}
    for _ in range(2):assert c.post(f"/api/spareparts/{p.pk}/stock_in/",data,format="json").status_code==200
    p.refresh_from_db();assert p.current_stock==3 and PartTransaction.objects.count()==1
    assert c.post(f"/api/spareparts/{p.pk}/stock_in/",{**data,"quantity":"4"},format="json").status_code==409

def test_stale_version_and_non_demo_admission(w):
    a=w["asset"];c=w["login"](w["manager"])
    assert c.post(f"/api/assets/{a.pk}/state-transitions/",{"action":"request_admission","reason":"demo","version":99},format="json").status_code==409
    a.is_demo=False;a.save()
    assert c.post(f"/api/assets/{a.pk}/state-transitions/",{"action":"request_admission","reason":"not demo"},format="json").status_code==400
    assert not LifecycleEvent.objects.filter(asset=a,event_type="state_change").exists()

def test_revoked_authority_blocks_execution_and_details(w):
    a=w["asset"];order=WorkOrder.objects.create(equipment=a,requesting_org=w["a"],service_org=w["s"],assignee=w["tech"],requested_by=w["manager"],summary="Fictional",status="assigned")
    c=w["login"](w["tech"]);assert c.get(f"/api/workorders/{order.pk}/").status_code==200
    AssetServiceAuthorization.objects.filter(asset=a,service_org=w["s"]).update(is_active=False)
    assert c.post(f"/api/workorders/{order.pk}/accept/").status_code==404
    assert c.get(f"/api/assets/{a.pk}/").status_code==404

def test_membership_revocation_is_immediate(w):
    c=w["login"](w["op"]);Membership.objects.filter(user=w["op"]).update(is_active=False)
    assert c.get("/api/assets/").status_code==403

def test_external_asset_fields_are_minimized(w):
    a=w["asset"];a.notes="private notes";a.asset_value=Decimal("9000");a.save()
    WorkOrder.objects.create(equipment=a,requesting_org=w["a"],service_org=w["s"],assignee=w["tech"],requested_by=w["manager"],summary="Fictional")
    c=w["login"](w["tech"]);r=c.get(f"/api/assets/{a.pk}/")
    assert r.status_code==200 and "asset_value" not in r.data and "notes" not in r.data
    assert c.get(f"/api/assets/{a.pk}/timeline/").status_code==403

def test_report_date_boundaries_and_scope(w):
    a=w["asset"];c=w["login"](w["manager"]);today=timezone.localdate()
    for suffix,delta in [("over",-1),("today",0),("edge",30),("later",31)]:
        Asset.objects.create(code=suffix,name="Fictional",using_organization=w["a"],created_by=w["manager"],next_examination_date=today+timedelta(days=delta))
    s=c.get("/api/reports/overview/").data
    assert s["examinations"]["overdue"]==1 and s["examinations"]["expiring"]==2 and s["examinations"]["unknown"]==1
    assert c.get("/api/reports/overview/?from=bad").status_code==400
    assert c.get("/api/reports/overview/?as_of=2020-01-01").status_code==400
    assert c.get(f'/api/reports/overview/?using_org={w["b"].pk}').data["assets"]["total"]==0

def test_comment_routes_and_owner_authorization(w):
    a=w["asset"];wo=WorkOrder.objects.create(equipment=a,requesting_org=w["a"],requested_by=w["manager"],summary="Fictional")
    c=w["login"](w["other"])
    assert c.post("/api/workorders/comments/",{"work_order":wo.pk,"comment":"intrusion"},format="json").status_code==400
    c=w["login"](w["manager"]);r=c.post("/api/workorders/comments/",{"work_order":wo.pk,"comment":"safe <script> literal","is_internal":True},format="json")
    assert r.status_code==201,r.data
    assert c.get("/api/workorders/comments/").status_code==200

def test_platform_definition_does_not_trust_role():
    u=User.objects.create_user(username="role_only",role="admin")
    assert not u.is_admin
    u.is_staff=True;assert u.is_admin
