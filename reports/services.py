from datetime import date,datetime,time,timedelta
from django.db.models import Count,Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from users.access import asset_scope,order_scope,current_org,has_role
from inspections.models import InspectionTask,InspectionRecord

def dates(params):
    def parse(key,default):
        raw=params.get(key)
        if not raw:return default
        try:return date.fromisoformat(raw)
        except (ValueError,TypeError):raise ValidationError({key:"日期格式应为YYYY-MM-DD"})
    today=timezone.localdate();first=parse("from",today.replace(day=1));end=parse("to",today+timedelta(days=1));as_of=parse("as_of",today)
    if end<=first:raise ValidationError("结束日期必须晚于开始日期（结束日不含）")
    if (end-first).days>3660:raise ValidationError("统计日期跨度不能超过10年")
    if as_of!=today:raise ValidationError("P0仅支持今日快照，尚不支持历史as_of重建")
    return first,end,as_of
def summarize(request):
    params=request.query_params;first,end,today=dates(params);org=current_org(request)
    assets=asset_scope(request)
    # External service users receive only their tasks, not owner's asset distribution/history.
    if org and "using" not in org.capabilities:assets=assets.filter(work_orders__service_org=org).distinct()
    if params.get("using_org"):
        try:org_id=int(params["using_org"])
        except ValueError:raise ValidationError("单位筛选无效")
        assets=assets.filter(using_organization_id=org_id)
    if params.get("equipment_category"):assets=assets.filter(equipment_category=params["equipment_category"])
    if params.get("equipment"):
        try:asset_id=int(params["equipment"])
        except ValueError:raise ValidationError("设备筛选无效")
        assets=assets.filter(pk=asset_id)
    begin=timezone.make_aware(datetime.combine(first,time.min));finish=timezone.make_aware(datetime.combine(end,time.min))
    orders=order_scope(request).filter(equipment__in=assets,created_at__gte=begin,created_at__lt=finish)
    cm=orders.filter(wo_type="CM")
    own_assets=assets if org is None else assets.filter(using_organization=org)
    tasks=InspectionTask.objects.filter(plan__equipment__in=own_assets,scheduled_date__gte=first,scheduled_date__lt=end)
    records=InspectionRecord.objects.filter(equipment__in=own_assets,performed_at__gte=begin,performed_at__lt=finish)
    if not has_role(request,"manager"):tasks=tasks.filter(executor=request.user);records=records.filter(inspector=request.user)
    valid=tasks.exclude(status="canceled");total=valid.count()
    completed=valid.filter(status="completed",completed_at__lte=timezone.now()).count()
    try:window=int(params.get("window_days",30))
    except ValueError:raise ValidationError("提醒窗口应为整数")
    if not 0<=window<=365:raise ValidationError("提醒窗口应在0至365天")
    expiring=assets.filter(next_examination_date__gte=today,next_examination_date__lte=today+timedelta(days=window))
    overdue=assets.filter(next_examination_date__lt=today)
    def distribution(field):
        return [{"label":r[field] or "unknown","count":r["count"]} for r in assets.values(field).annotate(count=Count("pk")).order_by(field)]
    return {"generated_at":timezone.now().isoformat(),"as_of":str(today),"filters":{"from":str(first),"to":str(end),"equipment":params.get("equipment"),"equipment_category":params.get("equipment_category"),"using_org":params.get("using_org"),"window_days":window},"scope":{"organization":getattr(org,"pk",None),"organization_name":getattr(org,"name","平台范围")},"assets":{"total":assets.count(),"categories":distribution("equipment_category"),"statuses":distribution("status")},"workorders":{"total":cm.count(),"pending":cm.filter(status__in=["open","assigned","in_progress"]).count(),"completed":cm.filter(status__in=["completed","closed"]).count(),"canceled":cm.filter(status="canceled").count(),"maintenance_total":orders.filter(wo_type="PM").count()},"inspections":{"total":total,"completed":completed,"completion_rate":round(completed/total*100,2) if total else None,"abnormal_records":records.filter(result="fail").count(),"attention_records":records.filter(result="warning").count(),"abnormal_items":sum(1 for record in records for item in record.items if item.get("result")=="abnormal" or item.get("ok") is False),"canceled":tasks.filter(status="canceled").count()},"examinations":{"overdue":overdue.count(),"expiring":expiring.count(),"unknown":assets.filter(next_examination_date__isnull=True).count(),"results_available":False,"result_message":"P0未接入检测/检验结果流程；日期为人工模拟资料，不构成法定证明","expiring_assets":list(expiring.values("id","code","name","next_examination_date","examination_due_source")),"overdue_assets":list(overdue.values("id","code","name","next_examination_date","examination_due_source"))},"notice":"模拟业务数据，不构成法定检验证明、证书或许可"}
