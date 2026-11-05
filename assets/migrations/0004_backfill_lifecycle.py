from django.db import migrations
def backfill(apps,schema_editor):
    Asset=apps.get_model("assets","Asset");WO=apps.get_model("workorders","WorkOrder");Record=apps.get_model("inspections","InspectionRecord");Event=apps.get_model("assets","LifecycleEvent")
    for a in Asset.objects.all().iterator():
        Event.objects.get_or_create(source_type="Asset",source_id=a.pk,source_action="created",defaults={"asset_id":a.pk,"event_type":"registered","occurred_at":a.created_at,"actor_id":a.created_by_id,"actor_org_id":a.using_organization_id,"summary":"历史设备建档（原始资料导入）","is_historical":True,"is_demo":a.is_demo})
    for w in WO.objects.select_related("equipment").all().iterator():
        if not w.requesting_org_id and w.equipment.using_organization_id:WO.objects.filter(pk=w.pk).update(requesting_org_id=w.equipment.using_organization_id)
        for action,dt,actor in [("created",w.created_at,w.requested_by_id),("complete",w.completed_at,w.completed_by_id),("close",w.closed_at,w.closed_by_id)]:
            if dt:
                Event.objects.get_or_create(source_type="WorkOrder",source_id=w.pk,source_action=action,defaults={"asset_id":w.equipment_id,"event_type":"maintenance" if w.wo_type=="PM" else "repair","occurred_at":dt,"actor_id":actor,"actor_org_id":w.equipment.using_organization_id,"summary":"历史工单记录："+action,"is_historical":True,"is_demo":w.is_demo})
    for r in Record.objects.select_related("equipment").all().iterator():
        Record.objects.filter(pk=r.pk).update(using_org_id=r.equipment.using_organization_id)
        Event.objects.get_or_create(source_type="InspectionRecord",source_id=r.pk,source_action="historical",defaults={"asset_id":r.equipment_id,"event_type":"inspection","occurred_at":r.performed_at or r.created_at,"actor_id":r.inspector_id,"actor_org_id":r.equipment.using_organization_id,"summary":"历史点检导入（未记录执行时间时使用原记录时间）","is_historical":True,"is_demo":r.is_demo})
class Migration(migrations.Migration):
    dependencies=[("assets","0003_asset_archived_at_asset_equipment_category_and_more"),("workorders","0002_workorder_accepted_at_workorder_accepted_by_and_more"),("inspections","0003_inspectionrecord_idempotency_key_and_more")]
    operations=[migrations.RunPython(backfill,migrations.RunPython.noop)]
