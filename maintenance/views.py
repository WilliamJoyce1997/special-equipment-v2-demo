from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets,filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from cmms_project.exceptions import Conflict
from users.access import UnitPermission,asset_scope,current_org,require_manager
from assets.services import event
from workorders.services import create_order,move_order
from workorders.models import WorkOrder
from .models import MaintenancePlan,WorkOrderTemplate
from .serializers import MaintenancePlanSerializer,WorkOrderTemplateSerializer
class MaintenancePlanViewSet(viewsets.ModelViewSet):
    permission_classes=[UnitPermission];serializer_class=MaintenancePlanSerializer
    filter_backends=[DjangoFilterBackend,filters.SearchFilter]
    filterset_fields=["equipment","is_active","trigger_type","priority"];search_fields=["code","title"]
    def get_queryset(self):return MaintenancePlan.objects.filter(equipment__in=asset_scope(self.request,owned=True)).select_related("equipment","default_service_org").order_by("code")
    @transaction.atomic
    def perform_create(self,serializer):
        a=serializer.validated_data["equipment"];require_manager(self.request,a)
        p=serializer.save(created_by=self.request.user);event(a,self.request.user,current_org(self.request),"maintenance_plan",p,"created","创建保养计划")
    @transaction.atomic
    def perform_update(self,serializer):
        require_manager(self.request,serializer.instance.equipment);p=serializer.save()
        event(p.equipment,self.request.user,current_org(self.request),"maintenance_plan",p,"updated:"+timezone.now().isoformat(),"更新保养计划")
    def perform_destroy(self,instance):
        require_manager(self.request,instance.equipment)
        instance.is_active=False;instance.save(update_fields=["is_active"])
    @action(detail=True,methods=["post"])
    @transaction.atomic
    def generate_work_order(self,request,pk=None):
        p=self.get_object();require_manager(request,p.equipment)
        if not p.is_active:raise Conflict("计划已停用")
        key=f"maintenance:{p.pk}:{timezone.localdate().isoformat()}"
        old=WorkOrder.objects.filter(generation_key=key).first()
        if old:return Response({"work_order_id":old.pk,"wo_code":old.wo_code,"created":False})
        if not p.check_should_generate(current_counter=p.equipment.current_meter_reading):raise Conflict("尚未达到计划周期或计数阈值")
        wo=create_order(request,{"equipment":p.equipment,"wo_type":"PM","summary":"预防性维护 - "+p.title,"description":p.description,"priority":p.priority,"checklist":p.checklist_template,"maintenance_plan":p},generation_key=key)
        if p.default_service_org_id:
            if not p.default_assignee_id:raise ValidationError("请为默认受托单位选择有效执行人")
            move_order(request,wo,"assign",{"service_org":p.default_service_org_id,"assignee_id":p.default_assignee_id})
        p.last_generated_date=timezone.localdate();p.last_counter_value=p.equipment.current_meter_reading;p.save()
        return Response({"work_order_id":wo.pk,"wo_code":wo.wo_code,"created":True})
    @action(detail=True,methods=["post"])
    def activate(self,request,pk=None):return self._active(request,True)
    @action(detail=True,methods=["post"])
    def deactivate(self,request,pk=None):return self._active(request,False)
    def _active(self,request,value):
        p=self.get_object();require_manager(request,p.equipment);p.is_active=value;p.save();return Response({"is_active":value})
class WorkOrderTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[UnitPermission];serializer_class=WorkOrderTemplateSerializer;queryset=WorkOrderTemplate.objects.none()
