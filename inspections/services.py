import hashlib,json,copy
from datetime import datetime,timedelta,time
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError,PermissionDenied
from users.access import current_org,has_role,require_manager,member
from users.models import IdempotencyReceipt
from assets.services import event,bump
from cmms_project.exceptions import Conflict
from .models import InspectionTask,InspectionRecord,InspectionIssue
from .serializers import SubmissionSerializer,GenerateSerializer,validate_template

@transaction.atomic
def generate(request,plan,data):
    require_manager(request,plan.equipment)
    if not plan.is_active:raise Conflict("点检计划已停用")
    if not member(plan.executor,plan.using_org,["operator","manager"]):raise ValidationError("计划执行人已失效")
    serializer=GenerateSerializer(data=data);serializer.is_valid(raise_exception=True);data=serializer.validated_data
    first=data.get("from_date",timezone.localdate());last=data.get("to_date",first)
    if last<first or (last-first).days>30:raise ValidationError("生成日期范围必须为1至31天")
    snapshot=validate_template(plan.template.items_template)
    if not plan.template.is_active:raise Conflict("点检模板已停用")
    made=0
    for offset in range((last-first).days+1):
        day=first+timedelta(days=offset)
        if day<plan.start_date or (plan.end_date and day>plan.end_date) or (day-plan.start_date).days%plan.frequency_days:continue
        task,created=InspectionTask.objects.get_or_create(plan=plan,scheduled_date=day,defaults={"executor":plan.executor,"template_snapshot":copy.deepcopy(snapshot),"due_at":timezone.make_aware(datetime.combine(day+timedelta(days=1),time.min))})
        made+=int(created)
    return {"created":made,"tasks":plan.tasks.count()}

@transaction.atomic
def submit(request,payload,task):
    ser=SubmissionSerializer(data=payload);ser.is_valid(raise_exception=True);data=ser.validated_data;org=current_org(request)
    if task.executor_id!=request.user.pk or not member(request.user,org,["operator","manager"]):raise PermissionDenied("只能执行分配给本人的点检任务")
    fingerprint=hashlib.sha256(json.dumps(dict(payload),sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    action="inspection_submit";key=data["idempotency_key"]
    receipt=IdempotencyReceipt.objects.filter(organization=org,actor=request.user,action=action,client_key=key).first()
    if receipt:
        if receipt.fingerprint!=fingerprint:raise Conflict("相同提交键内容不同")
        return InspectionRecord.objects.get(pk=receipt.response["id"]),False
    if task.status!="pending":raise Conflict("任务已经执行或取消")
    items=data["items"];template=task.template_snapshot;given={}
    for item in items:
        code=item.get("item_code")
        if code in given or not code:raise ValidationError("项目编码重复或为空")
        given[code]=item
    if set(given)-{x["item_code"] for x in template}:raise ValidationError("包含模板以外项目")
    final=[]
    for expected in template:
        x=given.get(expected["item_code"])
        if not x:
            if expected.get("required",True):raise ValidationError("必检项目漏填："+expected["name"])
            continue
        if x.get("result") not in ["normal","abnormal","attention"]:raise ValidationError("点检结果无效")
        if any(len(str(x.get(f,"")))>2000 for f in ["note","value","unit"]):raise ValidationError("项目内容过长")
        final.append({**copy.deepcopy(expected),**{k:x.get(k,"") for k in ["result","value","unit","note"]},"ok":x["result"]!="abnormal"})
    if not final:raise ValidationError("至少完成一项点检")
    if not InspectionTask.objects.filter(pk=task.pk,status="pending").update(status="completed",completed_at=timezone.now()):raise Conflict()
    record=InspectionRecord.objects.create(task=task,equipment=task.plan.equipment,using_org=org,inspector=request.user,submitted_by=request.user,items=final,template_snapshot=template,performed_at=data["performed_at"],notes=data.get("notes",""),is_demo=task.plan.equipment.is_demo,idempotency_key=key,request_fingerprint=fingerprint)
    for item in final:
        if item["result"]!="normal":
            InspectionIssue.objects.create(record=record,item_code=item["item_code"],severity=item.get("severity","warning"),blocks_release=item.get("blocks_release",True))
    event(record.equipment,request.user,org,"inspection",record,"submitted","日常点检："+record.get_result_display(),{"result":record.result},occurred_at=record.performed_at)
    if record.issues.filter(blocks_release=True).exists():
        asset=record.equipment
        if asset.status!="retired":
            bump(asset,{"status":"inactive","lifecycle_stage":"suspended"})
            event(asset,request.user,org,"state_change",asset,f"blocking_issue:{asset.version}","点检异常阻断，设备停用待处理")
    IdempotencyReceipt.objects.create(organization=org,actor=request.user,action=action,client_key=key,fingerprint=fingerprint,response={"id":record.pk})
    return record,True

@transaction.atomic
def report(request,record):
    org=current_org(request)
    if record.using_org_id!=getattr(org,"pk",None) or not (record.inspector_id==request.user.pk or has_role(request,"manager")):raise PermissionDenied("无此点检上报权限")
    if not record.issues.exists():raise ValidationError("正常记录不能上报异常维修")
    if record.triggered_work_order_id:return record.triggered_work_order,False
    from workorders.services import create_order
    wo=create_order(request,{"equipment":record.equipment,"summary":"点检异常 - "+record.equipment.name,"description":record.notes or "虚构点检异常，请查看关联记录","wo_type":"CM"},reporter_record=record)
    InspectionRecord.objects.filter(pk=record.pk,triggered_work_order__isnull=True).update(triggered_work_order=wo)
    record.issues.update(work_order=wo)
    event(record.equipment,request.user,org,"issue_reported",record,"report_issue","点检异常关联维修工单",{"work_order_id":wo.pk})
    return wo,True

@transaction.atomic
def resolve(request,issue,data):
    require_manager(request,issue.record.equipment)
    note=str(data.get("resolution_note","")).strip()
    if not note:raise ValidationError({"resolution_note":"请填写复查依据"})
    if issue.status=="resolved":raise Conflict("问题已复核")
    if not issue.work_order_id or issue.work_order.status!="closed":raise Conflict("请先完成维修并由使用单位确认关闭")
    issue.status="resolved";issue.resolved_by=request.user;issue.resolved_at=timezone.now();issue.resolution_note=note;issue.save()
    event(issue.record.equipment,request.user,current_org(request),"issue_resolved",issue,"resolved","使用单位模拟复核异常已解决",{"note":note})
    return issue
