import pytest
from tests.test_p0 import w
from users.models import Membership,User
from workorders.models import WorkOrder
from rest_framework.test import APIClient
pytestmark=pytest.mark.django_db

def test_provider_manager_cannot_export_owner_asset_fields(w):
    Membership.objects.create(user=w["tech"],organization=w["s"],business_role="manager")
    WorkOrder.objects.create(equipment=w["asset"],service_org=w["s"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional")
    r=w["login"](w["tech"]).get("/api/assets/export_csv/")
    assert r.status_code==403

def test_member_directory_does_not_leak_other_unit_membership(w):
    Membership.objects.create(user=w["op"],organization=w["b"],business_role="operator")
    c=w["login"](w["manager"]);r=c.get(f'/api/auth/users/{w["op"].pk}/')
    assert r.status_code==200
    assert all(m["organization"]==w["a"].pk for m in r.data["memberships"])

def test_comment_cannot_spoof_controlled_event_kind(w):
    order=WorkOrder.objects.create(equipment=w["asset"],requesting_org=w["a"],requested_by=w["manager"],summary="Fictional")
    r=w["login"](w["manager"]).post("/api/workorders/comments/",{"work_order":order.pk,"comment":"fake close","event_kind":"close"},format="json")
    assert r.status_code==400

def test_platform_cross_unit_read_requires_explicit_all_context(w):
    u=User.objects.create_user(username="platform",role="admin",is_staff=True)
    c=APIClient();c.force_authenticate(u)
    assert c.get("/api/assets/").status_code==403
    c.credentials(HTTP_X_ORGANIZATION_ID="all")
    assert c.get("/api/assets/").status_code==200
