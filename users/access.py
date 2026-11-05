"""Shared unit boundary for lists, objects, foreign keys and reports."""
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS

def platform(user):
    return bool(user.is_authenticated and user.is_active and user.is_admin)

def current_org(request):
    if hasattr(request,"_cmms_org"): return request._cmms_org
    if not request.user.is_authenticated: raise PermissionDenied("请先登录")
    from .models import Organization, Membership
    memberships=Membership.objects.filter(user=request.user,is_active=True,organization__is_active=True)
    raw=request.headers.get("X-Organization-ID")
    if raw=="all" and platform(request.user):
        from .models import AuditLog
        AuditLog.log(actor=request.user,action="update",entity_type="AccessScope",entity_id=request.user.pk,diff={"scope":"all","path":request.path})
        request._cmms_org=None
        return None
    if raw:
        if not str(raw).isdigit(): raise PermissionDenied("单位上下文无效")
        org=Organization.objects.filter(pk=raw,is_active=True).first()
        if not org or not (platform(request.user) or memberships.filter(organization=org).exists()):raise PermissionDenied("无此单位权限")
    else:
        org=memberships.select_related("organization").first()
        org=org.organization if org else None
        if org is None:raise PermissionDenied("请选择有效单位；平台跨单位只读请显式选择all")
    request._cmms_org=org
    return org

def has_role(request,*roles):
    org=current_org(request)
    if platform(request.user):return True
    return bool(org and request.user.memberships.filter(organization=org,is_active=True,business_role__in=roles).exists())

def require_manager(request,asset=None):
    org=current_org(request)
    if org is None:raise PermissionDenied("跨单位视图只读，写入前请选择具体单位")
    if not has_role(request,"manager"):raise PermissionDenied("需要使用单位主管权限")
    if asset and asset.using_organization_id != getattr(org,"pk",None) and not platform(request.user):raise PermissionDenied("只有设备使用单位可以执行")
    return org

def authorized(asset,org,kind):
    if not org or not org.is_active or kind not in org.capabilities:return False
    today=timezone.localdate()
    return asset.service_authorizations.filter(service_org=org,is_active=True,service_kind=kind).filter(Q(valid_from__isnull=True)|Q(valid_from__lte=today)).filter(Q(valid_until__isnull=True)|Q(valid_until__gte=today)).exists()

def service_orders(org):
    from assets.models import AssetServiceAuthorization
    from workorders.models import WorkOrder
    today=timezone.localdate()
    auth=AssetServiceAuthorization.objects.filter(service_org=org,is_active=True).filter(Q(valid_from__isnull=True)|Q(valid_from__lte=today)).filter(Q(valid_until__isnull=True)|Q(valid_until__gte=today))
    allowed=Q(pk__in=[])
    if "maintenance" in org.capabilities:allowed |= Q(wo_type="PM",equipment_id__in=auth.filter(service_kind="maintenance").values("asset_id"))
    if "repair" in org.capabilities:allowed |= Q(wo_type="CM",equipment_id__in=auth.filter(service_kind="repair").values("asset_id"))
    return WorkOrder.objects.filter(service_org=org).filter(allowed)

def asset_scope(request,owned=False):
    from assets.models import Asset
    org=current_org(request);q=Asset.objects.filter(archived_at__isnull=True)
    if org is None:return q if platform(request.user) else q.none()
    own=Q(using_organization=org)
    if owned:return q.filter(own)
    return q.filter(own|Q(pk__in=service_orders(org).values("equipment_id"))).distinct()

def order_scope(request):
    from workorders.models import WorkOrder
    org=current_org(request)
    if org is None:return WorkOrder.objects.all() if platform(request.user) else WorkOrder.objects.none()
    return WorkOrder.objects.filter(Q(equipment__using_organization=org)|Q(pk__in=service_orders(org).values("pk"))).distinct()

class UnitPermission(BasePermission):
    def has_permission(self,request,view):
        if not request.user.is_authenticated:return False
        current_org(request)
        return request.method in SAFE_METHODS or (current_org(request) is not None and has_role(request,"manager"))

class PlatformPermission(BasePermission):
    def has_permission(self,request,view):return platform(request.user)

def member(user,org,roles=None):
    qs=user.memberships.filter(organization=org,is_active=True,user__is_active=True,organization__is_active=True)
    return qs.filter(business_role__in=roles).exists() if roles else qs.exists()
