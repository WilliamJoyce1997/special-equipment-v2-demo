from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from cmms_project.exceptions import Conflict
from users.access import require_manager,current_org
from users.models import AuditLog
from .models import Asset,LifecycleEvent,DemoAdmissionProfile

def event(asset,actor,org,kind,source,action,summary,payload=None,occurred_at=None,historical=False):
    obj,created=LifecycleEvent.objects.get_or_create(source_type=type(source).__name__,source_id=source.pk,source_action=action,defaults={"asset":asset,"actor":actor,"actor_org":org,"event_type":kind,"occurred_at":occurred_at or timezone.now(),"summary":summary,"payload_snapshot":payload or {},"is_demo":asset.is_demo,"is_historical":historical})
    if created:
        AuditLog.log(actor=actor,action="update",entity_type=type(source).__name__,entity_id=source.pk,entity_repr=summary,diff={"event":kind,"source_action":action})
    return obj

def check_version(obj,data):
    if "version" in data:
        try:matches=int(data["version"])==obj.version
        except (TypeError,ValueError):matches=False
        if not matches:raise Conflict("记录已更新，请刷新后重试")

def bump(obj,changes):
    old=obj.version
    changes={**changes,"updated_at":timezone.now()}
    if not type(obj).objects.filter(pk=obj.pk,version=old).update(**changes,version=old+1):raise Conflict()
    obj.refresh_from_db()

@transaction.atomic
def transition(request,asset,data):
    require_manager(request,asset);check_version(asset,data)
    reason=str(data.get("reason","")).strip()
    if not reason:raise ValidationError({"reason":"必须填写原因"})
    action=data.get("action");stage=asset.lifecycle_stage
    if asset.status=="retired" or stage=="retired":raise Conflict("报废设备不能恢复使用")
    if action=="suspend":
        if stage not in ["in_service","pending_acceptance"]:raise Conflict("当前阶段不能执行停用")
        newstage,newstatus="suspended","inactive"
    elif action in ["request_admission","confirm_admission"]:
        if not(asset.is_demo and asset.code.startswith("DEMO-SE-") and asset.using_organization_id):raise ValidationError("P0只允许虚构DEMO设备使用模拟准入")
        profile=DemoAdmissionProfile.objects.filter(organization=asset.using_organization,is_active=True,confirmed_at__isnull=False).order_by("-confirmed_at").first()
        if not profile or profile.conditions.get("fictional_only") is not True:raise Conflict("模拟准入条件尚未确认")
        if not (asset.equipment_category and asset.responsible_person_id):raise ValidationError("请补全设备类别和负责人")
        from inspections.models import InspectionIssue
        if InspectionIssue.objects.filter(record__equipment=asset,blocks_release=True).exclude(status="resolved").exists():raise Conflict("仍有未解决的阻断或待审异常")
        if asset.work_orders.filter(status__in=["assigned","in_progress","completed"]).exists():raise Conflict("仍有未确认关闭的任务")
        if action=="request_admission":
            if stage not in ["registered","suspended"]:raise Conflict("当前阶段不能申请模拟准入")
            newstage,newstatus="pending_acceptance","inactive"
        else:
            if stage!="pending_acceptance":raise Conflict("请先申请模拟准入")
            newstage,newstatus="in_service","active"
    else:raise ValidationError({"action":"不支持的状态动作"})
    old={"stage":stage,"status":asset.status}
    bump(asset,{"lifecycle_stage":newstage,"status":newstatus})
    event(asset,request.user,current_org(request),"state_change",asset,f"{action}:{asset.version}","模拟状态变更："+reason,{"from":old,"to":{"stage":newstage,"status":newstatus},"reason":reason,"simulated":True})
    return asset
