from django.db.models import F
from rest_framework import viewsets,filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from users.access import UnitPermission,current_org,require_manager,platform
from .models import SparePart
from .serializers import SparePartSerializer,PartTransactionSerializer
from .services import stock
class SparePartViewSet(viewsets.ModelViewSet):
    permission_classes=[UnitPermission];serializer_class=SparePartSerializer
    filter_backends=[DjangoFilterBackend,filters.SearchFilter];filterset_fields=["category","supplier"];search_fields=["part_code","name"]
    def get_queryset(self):
        org=current_org(self.request);qs=SparePart.objects.all()
        qs=qs.filter(owning_organization=org) if org else qs if platform(self.request.user) else qs.none()
        if self.request.query_params.get("low_stock")=="true":qs=qs.filter(current_stock__lte=F("min_stock"))
        return qs.order_by("part_code")
    def perform_create(self,serializer):
        org=require_manager(self.request)
        if not org:raise ValidationError("请选择单位")
        serializer.save(created_by=self.request.user,owning_organization=org,current_stock=0)
    def perform_destroy(self,instance):
        if instance.transactions.exists() or instance.current_stock:raise ValidationError("有库存或流水的备件不可删除")
        instance.delete()
    @action(detail=True,methods=["post"])
    def stock_in(self,request,pk=None):return Response(stock(request,self.get_object(),"in"))
    @action(detail=True,methods=["post"])
    def stock_out(self,request,pk=None):return Response(stock(request,self.get_object(),"out"))
    @action(detail=True,methods=["get"])
    def transactions(self,request,pk=None):
        return Response(PartTransactionSerializer(self.get_object().transactions.order_by("-created_at"),many=True).data)
