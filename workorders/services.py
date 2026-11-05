import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError,PermissionDenied
from cmms_project.exceptions import Conflict
from users.access import current_org,require_manager,authorized,member
from users.models import User,Organization
from assets.services import event,bump,check_version
from .models import WorkOrder,WorkOrderComment
from .serializers import CompletionSerializer

@transaction.atomic
def create_order(request,values,generation_key=None,reporter_record=None):
    asset=values["equipment"];org=current_org(request)
    if reporter_record is None:require_manager(request,asset)
    elif reporter_record.equipment_id!=asset.pk or reporter_record.inspector_id!=request.user.pk or reporter_record.using_org_id!=getattr(org,"pk",None):
        require_manager(request,asset)
    if asset.status=="retired" or asset.archived_at:raise Conflict("报废或归档设备不能新建任务")
    wo=WorkOrder.objects.create(**values,wo_code="WO-"+timezone.localdate().strftime("%Y%m%d")+"-"+uuid.uuid4().hex[:10].upper(),requested_by=request.user,requesting_org=asset.using_organization,is_demo=asset.is_demo,generation_key=generation_key)
    event(asset,request.user,org,"maintenance" if wo.wo_type=="PM" else "repair",wo,"created","创建维护任务" if wo.wo_type=="PM" else "创建维修任务")
    return wo

def executor(request,wo):
    org=current_org(request);kind="maintenance" if wo.wo_type=="PM" else "repair"
    if wo.assignee_id!=request.user.pk or wo.service_org_id!=getattr(org,"pk",None) or not member(request.user,org,["technician","manager"]) or not authorized(wo.equipment,org,kind):
        raise PermissionDenied("只有有效受托单位的指派执行人可操作")

@transaction.atomic
def move_order(request,wo,action,data):
    check_version(wo,data);org=current_org(request);now=timezone.now();changes={}
    if action=="assign":
        require_manager(request,wo.equipment)
        if wo.status!="open":raise Conflict("仅待处理任务可分配")
        service=Organization.objects.filter(pk=data.get("service_org"),is_active=True).first()
        user=User.objects.filter(pk=data.get("assignee_id"),is_active=True).first()
        kind="maintenance" if wo.wo_type=="PM" else "repair"
        if not service or not authorized(wo.equipment,service,kind):raise ValidationError({"service_org":"单位未获设备对应服务授权"})
        if not user or not member(user,service,["technician","manager"]):raise ValidationError({"assignee_id":"执行人不属于此受托单位"})
        changes={"service_org":service,"assignee":user,"assigned_by":request.user,"assigned_at":now,"status":"assigned"}
    elif action=="close":
        require_manager(request,wo.equipment)
        if wo.status!="completed":raise Conflict("仅已完工任务可确认关闭")
        changes={"status":"closed","closed_by":request.user,"closed_at":now}
    elif action=="cancel":
        require_manager(request,wo.equipment)
        if wo.status not in ["open","assigned"]:raise Conflict("当前任务不能取消")
        if not str(data.get("reason","")).strip():raise ValidationError({"reason":"取消需填写原因"})
        changes={"status":"canceled"}
    else:
        executor(request,wo)
        if action=="accept":
            if wo.status!="assigned" or wo.accepted_at:raise Conflict("任务不能重复接单")
            changes={"accepted_by":request.user,"accepted_at":now}
        elif action=="start":
            if wo.status!="assigned" or not wo.accepted_at:raise Conflict("请先由执行人接单")
            changes={"status":"in_progress","actual_start":now}
        elif action=="complete":
            if wo.status!="in_progress":raise Conflict("仅进行中任务可完工")
            serializer=CompletionSerializer(data=data);serializer.is_valid(raise_exception=True)
            changes={**serializer.validated_data,"total_cost":serializer.validated_data.get("parts_cost",wo.parts_cost),"status":"completed","actual_end":now,"completed_by":request.user,"completed_at":now}
        else:raise ValidationError("未知动作")
    bump(wo,changes)
    labels={"assign":"分配任务","accept":"受托单位接单","start":"开始处理/维修进场","complete":"完工反馈（不代表准用）","close":"使用单位确认关闭","cancel":"取消任务"}
    WorkOrderComment.objects.create(work_order=wo,author=request.user,actor_org=org,event_kind=action,performed_at=now,comment=labels[action]+("："+str(data["reason"]) if data.get("reason") else ""),is_internal=False)
    event(wo.equipment,request.user,org,"maintenance" if wo.wo_type=="PM" else "repair",wo,f"{action}:{wo.version}",labels[action],{"status":wo.status,"actions_taken":wo.actions_taken or ""})
    asset=wo.equipment
    if action=="start":
        bump(asset,{"status":"maintenance"})
        event(asset,request.user,org,"state_change",asset,f"maintenance:{asset.version}","设备进入维护/维修处理")
    if action=="close":
        from inspections.models import InspectionIssue
        InspectionIssue.objects.filter(work_order=wo,status="open").update(status="pending_verification")
        bump(asset,{"status":"inactive","lifecycle_stage":"suspended"})
        event(asset,request.user,org,"state_change",asset,f"await_review:{asset.version}","任务关闭，设备等待独立模拟复用确认")
    return wo
