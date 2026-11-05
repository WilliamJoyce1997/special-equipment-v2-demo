"""Original workorder regression scenarios updated for the approved secured workflow."""
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from workorders.models import WorkOrder
pytestmark=pytest.mark.django_db

def assigned(w,user):
    w.assignee=user;w.service_org=w.equipment.using_organization;w.status="assigned";w.save()
def executing(w,user):
    assigned(w,user);w.accepted_at=timezone.now();w.accepted_by=user;w.status="in_progress";w.actual_start=timezone.now();w.save()
def client(user):c=APIClient();c.force_authenticate(user);return c

class TestWorkOrderAPI:
    def test_create_work_order(self,authenticated_client,asset):
        r=authenticated_client.post("/api/workorders/",{"equipment":asset.pk,"wo_type":"CM","summary":"New work order","priority":"high"},format="json")
        assert r.status_code==201,r.data
        assert r.data["wo_code"].startswith("WO-") and WorkOrder.objects.filter(pk=r.data["id"]).exists()
    def test_list_work_orders(self,authenticated_client,work_order):
        r=authenticated_client.get("/api/workorders/");assert r.status_code==200 and r.data["count"]==1
    def test_get_work_order_detail(self,authenticated_client,work_order):
        r=authenticated_client.get(f"/api/workorders/{work_order.pk}/");assert r.status_code==200 and r.data["wo_code"]==work_order.wo_code
    def test_assign_work_order(self,authenticated_client,work_order,technician_user,organization):
        r=authenticated_client.post(f"/api/workorders/{work_order.pk}/assign/",{"assignee_id":technician_user.pk,"service_org":organization.pk},format="json")
        assert r.status_code==200,r.data;work_order.refresh_from_db();assert work_order.assignee==technician_user
    def test_start_work_order(self,work_order,technician_user):
        assigned(work_order,technician_user);c=client(technician_user);url=f"/api/workorders/{work_order.pk}/"
        assert c.post(url+"start/").status_code==409
        assert c.post(url+"accept/").status_code==200
        assert c.post(url+"start/").status_code==200
        work_order.refresh_from_db();assert work_order.status=="in_progress"
    def test_complete_work_order(self,work_order,technician_user):
        executing(work_order,technician_user);c=client(technician_user);url=f"/api/workorders/{work_order.pk}/complete/"
        assert c.post(url,{},format="json").status_code==400
        assert c.post(url,{"actions_taken":"Fictional repair complete"},format="json").status_code==200
    def test_close_work_order(self,authenticated_client,work_order,technician_user):
        executing(work_order,technician_user)
        assert client(technician_user).post(f"/api/workorders/{work_order.pk}/complete/",{"actions_taken":"Fixed"},format="json").status_code==200
        assert authenticated_client.post(f"/api/workorders/{work_order.pk}/close/").status_code==200
    def test_my_orders_filter(self,work_order,technician_user):
        assigned(work_order,technician_user)
        r=client(technician_user).get("/api/workorders/my_orders/");assert r.status_code==200 and len(r.data)==1
    def test_filter_by_status(self,authenticated_client,work_order):
        r=authenticated_client.get("/api/workorders/?status=open");assert r.status_code==200 and all(w["status"]=="open" for w in r.data["results"])
class TestWorkOrderWorkflow:
    def test_full_lifecycle(self,authenticated_client,work_order,technician_user,organization):
        url=f"/api/workorders/{work_order.pk}/"
        assert authenticated_client.post(url+"assign/",{"assignee_id":technician_user.pk,"service_org":organization.pk},format="json").status_code==200
        c=client(technician_user)
        for action,data in [("accept",{}),("start",{}),("complete",{"actions_taken":"Fictional full flow"})]:
            assert c.post(url+action+"/",data,format="json").status_code==200
        assert authenticated_client.post(url+"close/").status_code==200
        work_order.refresh_from_db();assert work_order.status=="closed"
