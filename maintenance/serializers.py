from rest_framework import serializers
from .models import MaintenancePlan,WorkOrderTemplate
from users.access import asset_scope,current_org,authorized,member
class MaintenancePlanSerializer(serializers.ModelSerializer):
    equipment_name=serializers.CharField(source="equipment.name",read_only=True)
    equipment_code=serializers.CharField(source="equipment.code",read_only=True)
    default_service_org_name=serializers.CharField(source="default_service_org.name",read_only=True)
    class Meta:
        model=MaintenancePlan;fields="__all__";read_only_fields=["created_by","created_at","updated_at","last_generated_date","last_counter_value"]
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        if self.context.get("request"):self.fields["equipment"].queryset=asset_scope(self.context["request"],owned=True)
    def validate(self,attrs):
        a=attrs.get("equipment",getattr(self.instance,"equipment",None))
        if self.instance and a!=self.instance.equipment:raise serializers.ValidationError("不能更改计划所属设备")
        kind=attrs.get("trigger_type",getattr(self.instance,"trigger_type","time"))
        if kind=="time" and not (attrs.get("frequency_value",getattr(self.instance,"frequency_value",None)) and attrs.get("frequency_unit",getattr(self.instance,"frequency_unit",None))):raise serializers.ValidationError("请填写有效保养周期")
        if kind=="counter" and not attrs.get("counter_threshold",getattr(self.instance,"counter_threshold",None)):raise serializers.ValidationError("计数阈值须大于零")
        org=attrs.get("default_service_org",getattr(self.instance,"default_service_org",None));person=attrs.get("default_assignee",getattr(self.instance,"default_assignee",None))
        if org and not authorized(a,org,"maintenance"):raise serializers.ValidationError("维护单位尚未获此设备授权")
        if person and (not org or not member(person,org,["technician","manager"])):raise serializers.ValidationError("维护人员不属于受托单位")
        return attrs
class MaintenancePlanListSerializer(MaintenancePlanSerializer):pass
class WorkOrderTemplateSerializer(serializers.ModelSerializer):
    class Meta:model=WorkOrderTemplate;fields="__all__"
