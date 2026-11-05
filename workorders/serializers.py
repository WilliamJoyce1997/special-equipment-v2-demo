from rest_framework import serializers
from .models import WorkOrder,WorkOrderComment,WorkOrderPart
from users.access import asset_scope,order_scope
CONTROLLED={"status","assignee","assigned_by","assigned_at","accepted_by","accepted_at","completed_by","completed_at","closed_by","closed_at","actual_start","actual_end","requesting_org","service_org","version","total_cost","generation_key"}
class WorkOrderSerializer(serializers.ModelSerializer):
    source_inspection=serializers.SerializerMethodField()
    def get_source_inspection(self,obj):
        return obj.triggered_by_inspections.values_list("id",flat=True).first()
    equipment_code=serializers.CharField(source="equipment.code",read_only=True)
    equipment_name=serializers.CharField(source="equipment.name",read_only=True)
    assignee_name=serializers.CharField(source="assignee.full_name",read_only=True)
    requester_name=serializers.CharField(source="requested_by.full_name",read_only=True)
    service_org_name=serializers.CharField(source="service_org.name",read_only=True)
    wo_type_display=serializers.CharField(source="get_wo_type_display",read_only=True)
    status_display=serializers.CharField(source="get_status_display",read_only=True)
    priority_display=serializers.CharField(source="get_priority_display",read_only=True)
    class Meta:
        model=WorkOrder;fields="__all__"
        read_only_fields=list(CONTROLLED|{"id","wo_code","requested_by","created_at","updated_at","is_demo"})
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        request=self.context.get("request")
        if request:
            self.fields["equipment"].queryset=asset_scope(request,owned=True)
            self.fields["maintenance_plan"].read_only=True
    def validate(self,attrs):
        if CONTROLLED.intersection(self.initial_data):raise serializers.ValidationError("状态、单位与人员必须通过专用业务动作修改")
        if self.instance and "equipment" in attrs and attrs["equipment"]!=self.instance.equipment:raise serializers.ValidationError("不能改变工单所属设备")
        if attrs.get("wo_type","CM") not in ["PM","CM"]:raise serializers.ValidationError("P0仅支持维护PM和维修CM，不代表检测或检验")
        start=attrs.get("planned_start",getattr(self.instance,"planned_start",None));end=attrs.get("planned_end",getattr(self.instance,"planned_end",None))
        if start and end and end<start:raise serializers.ValidationError("计划结束不能早于开始")
        return attrs
class WorkOrderListSerializer(WorkOrderSerializer):pass
class WorkOrderCommentSerializer(serializers.ModelSerializer):
    event_kind=serializers.ChoiceField(choices=["progress","entry","feedback"],default="progress")
    author_name=serializers.CharField(source="author.full_name",read_only=True)
    class Meta:
        model=WorkOrderComment;fields="__all__"
        read_only_fields=["author","actor_org","created_at","performed_at"]
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        if self.context.get("request"):self.fields["work_order"].queryset=order_scope(self.context["request"])
class WorkOrderPartSerializer(serializers.ModelSerializer):
    class Meta:
        model=WorkOrderPart;fields="__all__";read_only_fields=["total_cost"]
class WorkOrderAssignSerializer(serializers.Serializer):
    assignee_id=serializers.IntegerField(min_value=1)
    service_org=serializers.IntegerField(min_value=1)
class CompletionSerializer(serializers.Serializer):
    actions_taken=serializers.CharField()
    root_cause=serializers.CharField(required=False,allow_blank=True,allow_null=True)
    notes=serializers.CharField(required=False,allow_blank=True,allow_null=True)
    downtime_minutes=serializers.IntegerField(min_value=0,required=False)
    labor_hours=serializers.DecimalField(max_digits=6,decimal_places=2,min_value=0,required=False)
    parts_cost=serializers.DecimalField(max_digits=10,decimal_places=2,min_value=0,required=False)
