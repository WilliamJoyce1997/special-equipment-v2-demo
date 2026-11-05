from rest_framework import serializers
from decimal import Decimal
from .models import SparePart,PartTransaction
class SparePartSerializer(serializers.ModelSerializer):
    stock_status=serializers.CharField(read_only=True)
    is_below_min_stock=serializers.BooleanField(read_only=True)
    total_value=serializers.DecimalField(max_digits=15,decimal_places=2,read_only=True)
    class Meta:
        model=SparePart;fields="__all__";read_only_fields=["created_by","created_at","updated_at","current_stock","owning_organization"]
    def validate(self,attrs):
        if "owning_organization" in self.initial_data or "current_stock" in self.initial_data:raise serializers.ValidationError("单位由登录身份确定，库存只能通过出入库动作修改")
        return attrs
class PartTransactionSerializer(serializers.ModelSerializer):
    operator_name=serializers.CharField(source="operator.full_name",read_only=True)
    class Meta:model=PartTransaction;fields="__all__"
class StockSerializer(serializers.Serializer):
    quantity=serializers.DecimalField(max_digits=10,decimal_places=2,min_value=Decimal('0.01'),max_value=Decimal('99999999.99'))
    reference=serializers.CharField(max_length=100,required=False,allow_blank=True)
    notes=serializers.CharField(required=False,allow_blank=True)
    related_work_order=serializers.IntegerField(required=False,allow_null=True,min_value=1)
    idempotency_key=serializers.CharField(max_length=100,required=False,allow_blank=True)
