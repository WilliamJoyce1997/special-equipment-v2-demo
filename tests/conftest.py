import pytest
from rest_framework.test import APIClient
from users.models import User,Organization,Membership
from assets.models import Asset,AssetServiceAuthorization
from workorders.models import WorkOrder

@pytest.fixture
def organization(db):
    return Organization.objects.create(code="LEGACY-TEST",name="Fictional legacy regression unit",capabilities=["using","maintenance","repair"])
def make_user(name,role,org,business_role):
    u=User.objects.create_user(username=name,password=name+"123",full_name=name.title()+" User",role=role,is_staff=role=="admin")
    Membership.objects.create(user=u,organization=org,business_role=business_role);return u
@pytest.fixture
def api_client():return APIClient()
@pytest.fixture
def admin_user(db,organization):return make_user("admin","admin",organization,"manager")
@pytest.fixture
def supervisor_user(db,organization):return make_user("supervisor","supervisor",organization,"manager")
@pytest.fixture
def technician_user(db,organization):return make_user("technician","technician",organization,"technician")
@pytest.fixture
def authenticated_client(api_client,admin_user):
    api_client.force_authenticate(admin_user);return api_client
@pytest.fixture
def asset(db,admin_user,organization):
    a=Asset.objects.create(code="AST-001",name="Test Equipment",process="Assembly",factory="Factory A",workshop="Workshop 1",line="Line 1",station="Station 1",status="active",created_by=admin_user,using_organization=organization)
    for kind in ["maintenance","repair"]:AssetServiceAuthorization.objects.create(asset=a,service_org=organization,service_kind=kind)
    return a
@pytest.fixture
def work_order(db,asset,admin_user,organization):
    return WorkOrder.objects.create(wo_code="WO-2024-0001",equipment=asset,wo_type="CM",status="open",summary="Test work order",description="Test description",requested_by=admin_user,requesting_org=organization)
