from rest_framework import serializers
from django.utils import timezone
from users.access import current_org,asset_scope,member
from .models import InspectionTemplate,InspectionPlan,InspectionTask,InspectionRecord,InspectionIssue
def validate_template(items):
    if not isinstance(items,list) or not items:raise serializers.ValidationError("至少配置一个点检项目")
    codes=set()
    for item in items:
        if not isinstance(item,dict) or not item.get("item_code") or not item.get("name"):raise serializers.ValidationError("每项需项目编码和名称")
        if len(str(item["item_code"]))>100 or item["item_code"] in codes:raise serializers.ValidationError("项目编码重复或过长")
        codes.add(item["item_code"])
        if item.get("severity","warning") not in ["info","warning","blocking"]:raise serializers.ValidationError("异常等级无效")
        if "blocks_release" in item and not isinstance(item["blocks_release"],bool):raise serializers.ValidationError("阻断标志应为布尔值")
    return items
class TemplateSerializer(serializers.ModelSerializer):
    class Meta:model=InspectionTemplate;fields="__all__";read_only_fields=["organization"]
    def validate_items_template(self,value):return validate_template(value)
class PlanSerializer(serializers.ModelSerializer):
    equipment_name=serializers.CharField(source="equipment.name",read_only=True)
    executor_name=serializers.CharField(source="executor.full_name",read_only=True)
    class Meta:model=InspectionPlan;fields="__all__";read_only_fields=["using_org","created_by","created_at"]
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs);r=self.context.get("request")
        if r:
            self.fields["equipment"].queryset=asset_scope(r,owned=True)
            self.fields["template"].queryset=InspectionTemplate.objects.filter(organization=current_org(r),is_active=True)
    def validate(self,attrs):
        org=current_org(self.context["request"])
        person=attrs.get("executor",getattr(self.instance,"executor",None))
        if not person or not member(person,org,["operator","manager"]):raise serializers.ValidationError("点检员必须属于本使用单位")
        if self.instance and attrs.get("equipment",self.instance.equipment)!=self.instance.equipment:raise serializers.ValidationError("不能改变计划设备")
        start=attrs.get("start_date",getattr(self.instance,"start_date",None));end=attrs.get("end_date",getattr(self.instance,"end_date",None))
        if start and end and end<start:raise serializers.ValidationError("结束日期早于开始日期")
        return attrs
class TaskSerializer(serializers.ModelSerializer):
    equipment=serializers.IntegerField(source="plan.equipment_id",read_only=True)
    equipment_name=serializers.CharField(source="plan.equipment.name",read_only=True)
    plan_title=serializers.CharField(source="plan.title",read_only=True)
    executor_name=serializers.CharField(source="executor.full_name",read_only=True)
    class Meta:model=InspectionTask;fields="__all__"
class IssueSerializer(serializers.ModelSerializer):
    class Meta:model=InspectionIssue;fields="__all__"
class RecordSerializer(serializers.ModelSerializer):
    equipment_name=serializers.CharField(source="equipment.name",read_only=True)
    inspector_name=serializers.CharField(source="inspector.full_name",read_only=True)
    issues=IssueSerializer(many=True,read_only=True)
    class Meta:model=InspectionRecord;fields="__all__"
class SubmissionSerializer(serializers.Serializer):
    task=serializers.IntegerField(min_value=1)
    items=serializers.ListField(child=serializers.DictField(),allow_empty=False)
    performed_at=serializers.DateTimeField()
    notes=serializers.CharField(required=False,allow_blank=True,max_length=4000)
    idempotency_key=serializers.CharField(max_length=100,required=True)
    def validate_performed_at(self,value):
        from datetime import timedelta
        if value>timezone.now()+timedelta(minutes=5):raise serializers.ValidationError("执行时间不能晚于当前时间")
        return value
class GenerateSerializer(serializers.Serializer):
    from_date=serializers.DateField(required=False)
    to_date=serializers.DateField(required=False)
