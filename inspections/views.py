from django.db import transaction
from rest_framework import viewsets,filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.access import UnitPermission,current_org,has_role,asset_scope,require_manager
from assets.services import event
from .models import InspectionTemplate,InspectionPlan,InspectionTask,InspectionRecord,InspectionIssue
from .serializers import TemplateSerializer,PlanSerializer,TaskSerializer,RecordSerializer,IssueSerializer,SubmissionSerializer
from .services import generate,submit,report,resolve

def plans_scope(request):
    qs=InspectionPlan.objects.filter(equipment__in=asset_scope(request,owned=True))
    return qs if has_role(request,"manager") else qs.filter(executor=request.user)
def tasks_scope(request):
    qs=InspectionTask.objects.filter(plan__equipment__in=asset_scope(request,owned=True))
    return qs if has_role(request,"manager") else qs.filter(executor=request.user)

class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes=[UnitPermission];serializer_class=TemplateSerializer
    def get_queryset(self):return InspectionTemplate.objects.filter(organization=current_org(self.request)).order_by("code")
    def perform_create(self,serializer):serializer.save(organization=current_org(self.request))
    def perform_destroy(self,instance):
        instance.is_active=False;instance.save(update_fields=["is_active"])
class PlanViewSet(viewsets.ModelViewSet):
    permission_classes=[UnitPermission];serializer_class=PlanSerializer
    filter_backends=[DjangoFilterBackend];filterset_fields=["equipment","is_active"]
    def get_queryset(self):return plans_scope(self.request).select_related("equipment","executor").order_by("-id")
    @transaction.atomic
    def perform_create(self,serializer):
        a=serializer.validated_data["equipment"];require_manager(self.request,a)
        p=serializer.save(using_org=current_org(self.request),created_by=self.request.user)
        event(a,self.request.user,current_org(self.request),"inspection_plan",p,"created","创建日常点检计划")
    def perform_destroy(self,instance):
        instance.is_active=False;instance.save(update_fields=["is_active"])
    @action(detail=True,methods=["post"])
    def generate_tasks(self,request,pk=None):return Response(generate(request,self.get_object(),request.data))
class TaskViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsAuthenticated];serializer_class=TaskSerializer
    filter_backends=[DjangoFilterBackend];filterset_fields=["status","executor","scheduled_date"]
    def get_queryset(self):return tasks_scope(self.request).select_related("plan__equipment","executor").order_by("-scheduled_date","-id")
    @action(detail=True,methods=["post"],permission_classes=[UnitPermission])
    def cancel(self,request,pk=None):
        task=self.get_object()
        if task.status!="pending":raise ValidationError("仅待执行任务可取消")
        task.status="canceled";task.save(update_fields=["status"]);return Response(TaskSerializer(task).data)
class RecordViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsAuthenticated];serializer_class=RecordSerializer
    filter_backends=[DjangoFilterBackend,filters.SearchFilter];filterset_fields=["equipment","result","inspector"];search_fields=["equipment__code","equipment__name"]
    def get_queryset(self):
        qs=InspectionRecord.objects.filter(equipment__in=asset_scope(self.request,owned=True))
        if not has_role(self.request,"manager"):qs=qs.filter(inspector=self.request.user)
        return qs.select_related("equipment","inspector").prefetch_related("issues").order_by("-performed_at","-id")
    def create(self,request):
        ser=SubmissionSerializer(data=request.data);ser.is_valid(raise_exception=True)
        from django.shortcuts import get_object_or_404
        task=get_object_or_404(tasks_scope(request),pk=ser.validated_data["task"])
        record,created=submit(request,request.data,task)
        return Response(RecordSerializer(record).data,status=201 if created else 200)
    @action(detail=True,methods=["post"])
    def report_issue(self,request,pk=None):
        wo,created=report(request,self.get_object())
        return Response({"work_order_id":wo.pk,"wo_code":wo.wo_code,"created":created})
class IssueViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsAuthenticated];serializer_class=IssueSerializer
    def get_queryset(self):return InspectionIssue.objects.filter(record__in=RecordViewSet.get_queryset(self)).order_by("-id")
    @action(detail=True,methods=["post"],permission_classes=[UnitPermission])
    def verify_resolution(self,request,pk=None):return Response(IssueSerializer(resolve(request,self.get_object(),request.data)).data)
