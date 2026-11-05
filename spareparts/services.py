import hashlib,json
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError
from users.access import current_org,has_role,platform
from users.models import IdempotencyReceipt,AuditLog
from cmms_project.exceptions import Conflict
from .models import SparePart,PartTransaction
from .serializers import StockSerializer,SparePartSerializer

@transaction.atomic
def stock(request,part,direction):
    org=current_org(request)
    if part.owning_organization_id!=getattr(org,"pk",None) and not platform(request.user):raise ValidationError("库存不属于当前单位")
    if not has_role(request,"manager"):raise ValidationError("需要本单位库存管理权限")
    s=StockSerializer(data=request.data);s.is_valid(raise_exception=True);data=s.validated_data;q=data["quantity"]
    key=data.get("idempotency_key");action=f"stock:{part.pk}:{direction}"
    fingerprint=hashlib.sha256(json.dumps(dict(request.data),sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    if key:
        receipt=IdempotencyReceipt.objects.filter(organization=org,actor=request.user,action=action,client_key=key).first()
        if receipt:
            if receipt.fingerprint!=fingerprint:raise Conflict("相同幂等键内容不同")
            return receipt.response
    wo=None
    if data.get("related_work_order"):
        from workorders.models import WorkOrder
        wo=WorkOrder.objects.filter(pk=data["related_work_order"],equipment__using_organization=org).first()
        if not wo or wo.equipment.using_organization_id!=part.owning_organization_id:raise ValidationError("P0不允许跨单位工单领用")
    part.refresh_from_db();before=part.current_stock;delta=q if direction=="in" else -q
    after=before+delta
    if after<0:raise Conflict("库存不足")
    if after>Decimal("99999999.99"):raise ValidationError("库存数量超过上限")
    if not SparePart.objects.filter(pk=part.pk,current_stock=before).update(current_stock=F("current_stock")+delta):raise Conflict("库存已变化，请刷新重试")
    tx=PartTransaction.objects.create(part=part,transaction_type=direction,quantity=q,stock_before=before,stock_after=after,operator=request.user,remark=data.get("notes",""),reference=data.get("reference",""),related_work_order=wo)
    AuditLog.log(actor=request.user,action="stock_in" if direction=="in" else "stock_out",entity_type="PartTransaction",entity_id=tx.pk,diff={"before":str(before),"after":str(after),"organization":getattr(org,"pk",None)})
    part.refresh_from_db();result=SparePartSerializer(part).data
    if key:IdempotencyReceipt.objects.create(organization=org,actor=request.user,action=action,client_key=key,fingerprint=fingerprint,response=result)
    return result
