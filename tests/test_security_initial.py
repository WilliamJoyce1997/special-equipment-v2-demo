import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from assets.models import Asset
from workorders.models import WorkOrder

pytestmark = pytest.mark.django_db

def test_anonymous_cannot_register_administrator():
    c = APIClient()
    r = c.post("/api/auth/users/register/", {"username": "intruder", "password": "StrongExample_123!", "password_confirm": "StrongExample_123!", "role": "admin"}, format="json")
    assert r.status_code in (401, 403)
    assert not get_user_model().objects.filter(username="intruder").exists()

def test_anonymous_cannot_create_user():
    r = APIClient().post("/api/auth/users/", {"username": "intruder2", "password": "StrongExample_123!", "role": "admin"}, format="json")
    assert r.status_code in (401, 403)

def test_technician_cannot_start_someone_elses_order():
    U=get_user_model()
    owner=U.objects.create_user(username="owner",role="admin")
    stranger=U.objects.create_user(username="stranger",role="technician")
    a=Asset.objects.create(code="SEC-1",name="security",created_by=owner)
    w=WorkOrder.objects.create(equipment=a,requested_by=owner,summary="secured",status="assigned")
    c=APIClient();c.force_authenticate(stranger)
    r=c.post(f"/api/workorders/{w.pk}/start/",{},format="json")
    assert r.status_code in (403,404)
    w.refresh_from_db();assert w.status=="assigned"
