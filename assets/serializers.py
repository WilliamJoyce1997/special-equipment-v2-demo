from rest_framework import serializers
from .models import Asset,LifecycleEvent
from users.access import asset_scope,current_org,member
CONTROLLED={"status","lifecycle_stage","version","rule_confirmation","archived_at","examination_due_source"}

class AssetSerializer(serializers.ModelSerializer):
    status_display=serializers.CharField(source="get_status_display",read_only=True)
    location_display=serializers.SerializerMethodField()
    equipment_name=serializers.CharField(source="name",read_only=True)
    using_organization_name=serializers.CharField(source="using_organization.name",read_only=True)
    responsible_person_name=serializers.CharField(source="responsible_person.full_name",read_only=True)
    is_overdue=serializers.BooleanField(source="is_overdue_for_maintenance",read_only=True)
    class Meta:
        model=Asset
        fields="__all__"
        read_only_fields=["created_by","created_at","updated_at","version","status","lifecycle_stage","rule_confirmation","archived_at","examination_due_source"]
    def get_location_display(self,obj):return obj.installation_location or obj.get_full_location()
    def to_representation(self,obj):
        request=self.context.get("request")
        if request:
            org=current_org(request)
            if org and obj.using_organization_id!=org.pk and not request.user.is_admin:return AssetExternalSerializer(obj,context=self.context).data
        return super().to_representation(obj)
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        request=self.context.get("request")
        if request:self.fields["parent"].queryset=asset_scope(request,owned=True)
    def validate(self,attrs):
        if CONTROLLED.intersection(self.initial_data):raise serializers.ValidationError("运行状态必须通过受控业务动作修改")
        request=self.context["request"];org=current_org(request)
        if not org:raise serializers.ValidationError("写入前请选择一个单位")
        if "using" not in org.capabilities:raise serializers.ValidationError("只有使用单位可维护台账")
        if "using_organization" in attrs and attrs["using_organization"]!=org:raise serializers.ValidationError("不能指定其他使用单位")
        attrs["using_organization"]=org
        owner=attrs.get("responsible_person",getattr(self.instance,"responsible_person",None))
        if owner and not member(owner,org):raise serializers.ValidationError({"responsible_person":"负责人必须为本单位有效成员"})
        parent=attrs.get("parent");seen={self.instance.pk} if self.instance else set()
        while parent:
            if parent.pk in seen:raise serializers.ValidationError({"parent":"设备层级不能成环"})
            seen.add(parent.pk);parent=parent.parent
        inst=attrs.get("installation_organization")
        if inst and ("installation" not in inst.capabilities or not inst.is_active):raise serializers.ValidationError({"installation_organization":"安装单位能力无效"})
        code=attrs.get("code",getattr(self.instance,"code",""))
        demo=attrs.get("is_demo",getattr(self.instance,"is_demo",False))
        if demo and not code.startswith("DEMO-SE-"):raise serializers.ValidationError({"code":"虚构设备编号需以DEMO-SE-开头"})
        if self.instance and "is_demo" in attrs and self.instance.is_demo!=attrs["is_demo"]:raise serializers.ValidationError("不能改变既有设备演示标识")
        return attrs

class AssetListSerializer(AssetSerializer):pass

class AssetExternalSerializer(serializers.ModelSerializer):
    location_display=serializers.CharField(source="get_full_location",read_only=True)
    class Meta:
        model=Asset
        fields=["id","code","name","equipment_category","model","specification","installation_location","location_display","status","lifecycle_stage","is_demo"]

class AssetTreeSerializer(serializers.ModelSerializer):
    children=serializers.SerializerMethodField()
    class Meta:model=Asset;fields=["id","code","name","status","children"]
    def get_children(self,obj):
        request=self.context.get("request")
        qs=asset_scope(request).filter(parent=obj) if request else obj.children.none()
        return AssetTreeSerializer(qs,many=True,context=self.context).data

class LifecycleEventSerializer(serializers.ModelSerializer):
    actor_name=serializers.CharField(source="actor.full_name",read_only=True)
    actor_org_name=serializers.CharField(source="actor_org.name",read_only=True)
    class Meta:model=LifecycleEvent;fields="__all__"
