from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import User,AuditLog,Organization,Membership
from .serializers import UserSerializer,AuditLogSerializer
from .access import platform,current_org,has_role,PlatformPermission

class UserViewSet(viewsets.ModelViewSet):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]
    def get_permissions(self):
        return [PlatformPermission()] if self.action in ["create","register","update","partial_update","destroy"] else [IsAuthenticated()]
    def get_queryset(self):
        org=current_org(self.request)
        if platform(self.request.user) and org is None:return User.objects.all().order_by("id")
        return User.objects.filter(memberships__organization=org,memberships__is_active=True).distinct().order_by("id")
    @action(detail=False,methods=["get"])
    def me(self,request):
        return Response(UserSerializer(request.user,context={"request":request}).data)
    @action(detail=False,methods=["post"])
    def register(self,request):
        raise PermissionDenied("Demo不开放自助注册，请由平台管理员配置账号")
    def perform_destroy(self,instance):
        instance.is_active=False;instance.save(update_fields=["is_active"])

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=AuditLogSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        # Business timelines have unit-scoped visibility; technical audit is self-only unless platform admin.
        return AuditLog.objects.all() if platform(self.request.user) else AuditLog.objects.filter(actor=self.request.user)

class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsAuthenticated]
    def list(self,request):
        current_org(request)
        # Provider directory deliberately exposes only public demo identifiers/capabilities, never members/PII.
        rows=list(Organization.objects.filter(is_active=True).values("id","code","name","capabilities","is_demo"))
        return Response({"count":len(rows),"next":None,"previous":None,"results":rows})
    def retrieve(self,request,pk=None):
        raise PermissionDenied("请使用单位目录")
class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsAuthenticated]
    def list(self,request):
        org=current_org(request)
        qs=Membership.objects.filter(is_active=True,organization__is_active=True,user__is_active=True)
        qs=qs.filter(organization=org) if has_role(request,"manager") else qs.filter(user=request.user)
        rows=[{"id":x.pk,"user":x.user_id,"username":x.user.username,"full_name":x.user.full_name,"organization":x.organization_id,"business_role":x.business_role} for x in qs.select_related("user")]
        return Response({"count":len(rows),"next":None,"previous":None,"results":rows})
