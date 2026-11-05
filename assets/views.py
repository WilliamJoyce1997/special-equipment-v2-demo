"""
Views for Assets app
"""
import io
import csv
import openpyxl
from datetime import datetime
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from .models import Asset, AssetStatus
from .serializers import AssetSerializer, AssetListSerializer, AssetTreeSerializer, AssetExternalSerializer, LifecycleEventSerializer
from users.access import UnitPermission,asset_scope,current_org,require_manager,member,authorized,has_role
from .services import event,transition
from django.db import transaction
from rest_framework.exceptions import ValidationError,PermissionDenied
from .models import AssetServiceAuthorization
from users.models import Organization,Membership
from django.utils import timezone


class AssetPagination(PageNumberPagination):
    """自定义分页类，支持更大的页面大小"""
    page_size = 50  # 默认每页50条
    page_size_query_param = 'page_size'  # 允许客户端通过page_size参数控制
    max_page_size = 1000  # 最大允许1000条，足够显示所有设备


class IsAdminOrReadOnly(BasePermission):
    """
    自定义权限：只有admin可以修改，其他用户只读
    """
    def has_permission(self, request, view):
        # 读取操作允许所有认证用户
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated
        # 写入操作只允许admin
        return request.user.is_authenticated and request.user.role == 'admin'


class AssetViewSet(viewsets.ModelViewSet):
    """ViewSet for Asset model"""
    queryset = Asset.objects.select_related('parent', 'created_by').all()
    serializer_class = AssetSerializer
    permission_classes = [UnitPermission]
    pagination_class = AssetPagination  # 使用自定义分页类
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'factory', 'workshop', 'line', 'criticality','equipment_category','using_organization','vendor']
    search_fields = ['code', 'name', 'equipment_id', 'serial_number', 'vendor']
    ordering_fields = ['code', 'name', 'created_at']
    ordering = ['code']


    def get_queryset(self):
        qs=asset_scope(self.request).select_related("using_organization","responsible_person","parent")
        for name,lookup in [("start_date_after","start_date__gte"),("start_date_before","start_date__lte"),("next_examination_before","next_examination_date__lte")]:
            value=self.request.query_params.get(name)
            if value:
                from datetime import date
                try: date.fromisoformat(value)
                except ValueError: raise ValidationError({name:"日期格式应为YYYY-MM-DD"})
                qs=qs.filter(**{lookup:value})
        return qs

    def get_serializer_class(self):
        org=current_org(self.request)
        if self.request.method not in ["GET","HEAD","OPTIONS"]:return AssetSerializer
        if org and "using" not in org.capabilities and not self.request.user.is_admin:
            return AssetExternalSerializer
        return AssetListSerializer if self.action=="list" else AssetSerializer

    @transaction.atomic
    def perform_create(self,serializer):
        org=require_manager(self.request)
        asset=serializer.save(created_by=self.request.user,using_organization=org,status="inactive",lifecycle_stage="registered")
        event(asset,self.request.user,org,"registered",asset,"created","设备建档")

    @transaction.atomic
    def perform_update(self,serializer):
        require_manager(self.request,serializer.instance)
        asset=serializer.save(version=serializer.instance.version+1)
        event(asset,self.request.user,current_org(self.request),"asset_updated",asset,f"updated:{asset.version}","设备档案更新")

    def perform_destroy(self,instance):
        require_manager(self.request,instance)
        raise ValidationError("设备档案需保留，P0不提供物理删除；停用请使用状态操作")

    @action(detail=True,methods=["post"],url_path="state-transitions")
    def state_transitions(self,request,pk=None):
        return Response(AssetSerializer(transition(request,self.get_object(),request.data),context={"request":request}).data)

    @action(detail=True,methods=["get"])
    def timeline(self,request,pk=None):
        asset=self.get_object()
        if current_org(request) and asset.using_organization_id!=current_org(request).pk:
            raise PermissionDenied("外委单位请通过本单位工单查看过程，不开放完整设备历史")
        qs=asset.lifecycle_events.select_related("actor","actor_org").all()
        if request.query_params.get("event_type"):qs=qs.filter(event_type=request.query_params["event_type"])
        for field,lookup in [("from","occurred_at__gte"),("to","occurred_at__lt")]:
            value=request.query_params.get(field)
            if value:
                from datetime import date
                try:date.fromisoformat(value)
                except ValueError:raise ValidationError({field:"日期格式无效"})
                qs=qs.filter(**{lookup:value})
        page=self.paginate_queryset(qs)
        return self.get_paginated_response(LifecycleEventSerializer(page,many=True).data)

    @action(detail=True,methods=["get","post"])
    @transaction.atomic
    def service_authorizations(self,request,pk=None):
        from rest_framework import serializers
        asset=self.get_object();require_manager(request,asset)
        if request.method=="POST":
            class Input(serializers.Serializer):
                service_org=serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
                service_kind=serializers.ChoiceField(choices=["maintenance","repair"])
                is_active=serializers.BooleanField(default=True)
                valid_from=serializers.DateField(required=False,allow_null=True)
                valid_until=serializers.DateField(required=False,allow_null=True)
                reason=serializers.CharField(required=False,allow_blank=True,max_length=200)
            inp=Input(data=request.data);inp.is_valid(raise_exception=True);data=inp.validated_data
            org=data["service_org"];kind=data["service_kind"]
            if data["is_active"] and (not org.is_active or kind not in org.capabilities):raise ValidationError("服务单位能力无效")
            old=AssetServiceAuthorization.objects.filter(asset=asset,service_org=org,service_kind=kind).first()
            begin=data.get("valid_from",getattr(old,"valid_from",None));end=data.get("valid_until",getattr(old,"valid_until",None))
            if begin and end and begin>end:raise ValidationError("授权结束日期不能早于开始日期")
            obj,created=AssetServiceAuthorization.objects.update_or_create(asset=asset,service_org=org,service_kind=kind,defaults={"is_active":data["is_active"],"valid_from":begin,"valid_until":end})
            event(asset,request.user,current_org(request),"authorization",obj,f"changed:{timezone.now().isoformat()}","授予服务权限" if obj.is_active else "撤销服务权限",{"service_org":org.name,"kind":kind,"is_active":obj.is_active,"valid_from":str(begin) if begin else None,"valid_until":str(end) if end else None,"reason":data.get("reason","P0业务授权配置")})
        rows=[]
        for auth in asset.service_authorizations.select_related("service_org"):
            valid=authorized(asset,auth.service_org,auth.service_kind)
            if not valid and request.query_params.get("include_inactive")!="1":continue
            people=Membership.objects.filter(organization=auth.service_org,is_active=True,user__is_active=True,business_role__in=["technician","manager"]).select_related("user")
            rows.append({"id":auth.pk,"service_org":auth.service_org_id,"service_org_name":auth.service_org.name,"service_kind":auth.service_kind,"is_active":auth.is_active,"effective":valid,"valid_from":auth.valid_from,"valid_until":auth.valid_until,"members":[{"id":m.user_id,"full_name":m.user.full_name,"username":m.user.username} for m in people]})
        return Response(rows)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get assets overdue for maintenance"""
        overdue_assets = [a for a in self.get_queryset() if a.is_overdue_for_maintenance()]
        serializer = AssetListSerializer(overdue_assets, many=True,context={'request':request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get asset hierarchy tree"""
        root_assets = self.get_queryset().filter(parent__isnull=True)
        serializer = AssetTreeSerializer(root_assets, many=True,context={'request':request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Get child assets"""
        asset = self.get_object()
        children = self.get_queryset().filter(parent=asset)
        serializer = AssetListSerializer(children, many=True,context={'request':request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Download Excel template for asset import"""
        wb = Workbook()
        ws = wb.active
        ws.title = "设备导入模板"

        # 表头样式
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")

        # 定义表头
        headers = [
            ('code', '设备编码*', '必填，唯一'),
            ('name', '设备名称*', '必填'),
            ('process', '工艺', ''),
            ('equipment_id', '设备ID', ''),
            ('machine_name', '机器名称', ''),
            ('factory', '工厂', ''),
            ('workshop', '车间', ''),
            ('line', '产线', ''),
            ('station', '工位', ''),
            ('vendor', '供应商', ''),
            ('model', '型号', ''),
            ('serial_number', '序列号', ''),
            ('specification', '规格说明', ''),
            ('start_date', '投用日期', '格式: YYYY-MM-DD'),
            ('warranty_expiry', '保修到期', '格式: YYYY-MM-DD'),
            ('status', '状态', 'active/inactive/retired/maintenance'),
            ('criticality', '重要性', 'critical/important/normal'),
            ('cost_center', '成本中心', ''),
            ('asset_value', '资产价值', '数字'),
            ('expected_life_years', '预计使用年限(年)', '数字'),
            ('meter_unit', '计量单位', ''),
            ('current_meter_reading', '当前计量读数', '数字'),
            ('notes', '备注', ''),
        ]

        # 写入表头
        for col_idx, (field, name, desc) in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.value = f"{name}\n({desc})"
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')

        # 设置列宽
        column_widths = [15, 20, 12, 15, 15, 12, 12, 12, 12, 15, 15, 18, 30, 15, 15, 20, 18, 12, 12, 15, 12, 18, 30]
        for col_idx, width in enumerate(column_widths, 1):
            ws.column_dimensions[chr(64 + col_idx)].width = width

        # 添加示例数据
        example_data = [
            'EQ-001', '数控机床', '机加工', 'EID-001', 'CNC-01', '一厂', '机加车间',
            'Line-1', 'Station-A', 'Siemens', 'X2000', 'SN202401001', '额定功率10kW',
            '2024-01-15', '2025-01-15', 'active', 'important', 'CC001', '150000.00', '10', 'hours', '1000', '设备运行正常'
        ]
        for col_idx, value in enumerate(example_data, 1):
            ws.cell(row=2, column=col_idx, value=value)

        # 设置行高
        ws.row_dimensions[1].height = 40

        # 保存到内存
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="设备导入模板.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        """Import assets from Excel or CSV file"""
        file = request.FILES.get('file')
        if not file:
            return Response(
                {"error": "请选择要导入的文件"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 检查文件类型
        file_ext = file.name.split('.')[-1].lower()
        if file_ext not in ['xlsx', 'xls', 'csv']:
            return Response(
                {"error": "仅支持 Excel (.xlsx, .xls) 或 CSV 文件"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 读取文件
            if file_ext == 'csv':
                data = self._read_csv_file(file)
            else:
                data = self._read_excel_file(file)

            # 处理导入
            result = self._process_import_data(data, request.user)

            return Response(result, status=status.HTTP_200_OK if result['success_count'] > 0 else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response(
                {"error": f"导入失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _read_csv_file(self, file):
        """Read CSV file and return data list"""
        data = []
        decoded_file = file.read().decode('utf-8-sig')
        reader = csv.DictReader(decoded_file.splitlines())

        # 获取中文列名到字段的映射
        header_map = self._get_header_map(reader.fieldnames)

        for row_num, row in enumerate(reader, start=2):
            data.append({
                'row_num': row_num,
                'data': self._map_row_data(row, header_map)
            })
        return data

    def _read_excel_file(self, file):
        """Read Excel file and return data list"""
        data = []
        wb = openpyxl.load_workbook(file)
        ws = wb.active

        # 获取表头映射
        headers = []
        for cell in ws[1]:
            value = cell.value
            if value:
                # 从"中文名 (说明)"格式中提取中文名
                header_name = str(value).split('\n')[0].split('(')[0].strip('*').strip()
                headers.append(header_name)
            else:
                headers.append('')

        header_map = self._get_header_map(headers)

        # 读取数据行（跳过第一行表头）
        for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if any(cell is not None for cell in row):
                row_data = {}
                for col_idx, value in enumerate(row):
                    if col_idx < len(headers):
                        field_name = header_map.get(headers[col_idx])
                        if field_name:
                            row_data[field_name] = value
                data.append({
                    'row_num': row_idx,
                    'data': row_data
                })

        return data

    def _get_header_map(self, headers):
        """Get mapping from Chinese header names to field names"""
        header_map = {
            '设备编码': 'code',
            '设备名称': 'name',
            '工艺': 'process',
            '设备ID': 'equipment_id',
            '机器名称': 'machine_name',
            '工厂': 'factory',
            '车间': 'workshop',
            '产线': 'line',
            '工位': 'station',
            '供应商': 'vendor',
            '型号': 'model',
            '序列号': 'serial_number',
            '规格说明': 'specification',
            '投用日期': 'start_date',
            '保修到期': 'warranty_expiry',
            '状态': 'status',
            '重要性': 'criticality',
            '成本中心': 'cost_center',
            '资产价值': 'asset_value',
            '预计使用年限(年)': 'expected_life_years',
            '计量单位': 'meter_unit',
            '当前计量读数': 'current_meter_reading',
            '备注': 'notes',
        }
        # 同时支持英文字段名 - 修复字典遍历时修改的问题
        english_fields = {}
        for field in header_map.values():
            english_fields[field] = field
        header_map.update(english_fields)
        return header_map

    def _map_row_data(self, row, header_map):
        """Map CSV row data to field names"""
        mapped_data = {}
        for csv_header, value in row.items():
            if csv_header in header_map:
                field_name = header_map[csv_header]
                mapped_data[field_name] = value
        return mapped_data

    def _process_import_data(self, data, user):
        """Process imported data and create assets"""
        success_count = 0
        error_count = 0
        errors = []

        for item in data:
            row_num = item['row_num']
            asset_data = item['data']

            try:
                # 验证必填字段
                if not asset_data.get('code'):
                    errors.append(f"第{row_num}行: 设备编码不能为空")
                    error_count += 1
                    continue

                if not asset_data.get('name'):
                    errors.append(f"第{row_num}行: 设备名称不能为空")
                    error_count += 1
                    continue

                # 检查编码是否已存在
                if Asset.objects.filter(code=asset_data['code']).exists():
                    errors.append(f"第{row_num}行: 设备编码 '{asset_data['code']}' 已存在")
                    error_count += 1
                    continue

                # 处理日期字段
                for date_field in ['start_date', 'warranty_expiry']:
                    value = asset_data.get(date_field)
                    if value:
                        if isinstance(value, datetime):
                            asset_data[date_field] = value.date()
                        elif isinstance(value, str):
                            try:
                                asset_data[date_field] = datetime.strptime(value, '%Y-%m-%d').date()
                            except ValueError:
                                try:
                                    asset_data[date_field] = datetime.strptime(value, '%Y/%m/%d').date()
                                except ValueError:
                                    errors.append(f"第{row_num}行: {date_field} 日期格式错误，应为 YYYY-MM-DD")
                                    error_count += 1
                                    continue

                # 设置默认值
                asset_data.setdefault('status', 'active')
                asset_data.setdefault('criticality', 'normal')
                asset_data.setdefault('current_meter_reading', 0)
                asset_data.pop('status',None)
                serializer=AssetSerializer(data=asset_data,context={'request':self.request})
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                success_count += 1

            except Exception as e:
                errors.append(f"第{row_num}行: {str(e)}")
                error_count += 1

        return {
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:20],  # 最多返回20条错误
            'message': f'导入完成: 成功 {success_count} 条, 失败 {error_count} 条'
        }

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export only the current using unit's assets."""
        org=current_org(request)
        if org and "using" not in org.capabilities:raise PermissionDenied("外委单位不能导出使用单位设备档案")
        if not has_role(request,"manager"):raise PermissionDenied("需要使用单位主管权限")
        assets = self.filter_queryset(self.get_queryset().filter(using_organization=current_org(request)))

        wb = Workbook()
        ws = wb.active
        ws.title = "设备台账"

        # 表头
        headers = [
            '设备编码', '设备名称', '工艺', '设备ID', '机器名称', '工厂', '车间',
            '产线', '工位', '供应商', '型号', '序列号', '规格说明', '投用日期',
            '保修到期', '状态', '重要性', '成本中心', '资产价值', '预计使用年限',
            '计量单位', '当前计量读数', '最后保养日期', '下次保养日期', '备注'
        ]

        # 写入表头
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            cell.alignment = Alignment(horizontal='center', vertical='center')

        # 写入数据
        for row_idx, asset in enumerate(assets, 2):
            ws.cell(row=row_idx, column=1, value=asset.code)
            ws.cell(row=row_idx, column=2, value=asset.name)
            ws.cell(row=row_idx, column=3, value=asset.process or '')
            ws.cell(row=row_idx, column=4, value=asset.equipment_id or '')
            ws.cell(row=row_idx, column=5, value=asset.machine_name or '')
            ws.cell(row=row_idx, column=6, value=asset.factory or '')
            ws.cell(row=row_idx, column=7, value=asset.workshop or '')
            ws.cell(row=row_idx, column=8, value=asset.line or '')
            ws.cell(row=row_idx, column=9, value=asset.station or '')
            ws.cell(row=row_idx, column=10, value=asset.vendor or '')
            ws.cell(row=row_idx, column=11, value=asset.model or '')
            ws.cell(row=row_idx, column=12, value=asset.serial_number or '')
            ws.cell(row=row_idx, column=13, value=asset.specification or '')
            ws.cell(row=row_idx, column=14, value=asset.start_date.strftime('%Y-%m-%d') if asset.start_date else '')
            ws.cell(row=row_idx, column=15, value=asset.warranty_expiry.strftime('%Y-%m-%d') if asset.warranty_expiry else '')
            ws.cell(row=row_idx, column=16, value=asset.status)
            ws.cell(row=row_idx, column=17, value=asset.criticality)
            ws.cell(row=row_idx, column=18, value=asset.cost_center or '')
            ws.cell(row=row_idx, column=19, value=float(asset.asset_value) if asset.asset_value else '')
            ws.cell(row=row_idx, column=20, value=asset.expected_life_years or '')
            ws.cell(row=row_idx, column=21, value=asset.meter_unit or '')
            ws.cell(row=row_idx, column=22, value=float(asset.current_meter_reading))
            ws.cell(row=row_idx, column=23, value=asset.last_maintenance_date.strftime('%Y-%m-%d') if asset.last_maintenance_date else '')
            ws.cell(row=row_idx, column=24, value=asset.next_maintenance_date.strftime('%Y-%m-%d') if asset.next_maintenance_date else '')
            ws.cell(row=row_idx, column=25, value=asset.notes or '')

        # 设置列宽
        for col_idx in range(1, 26):
            ws.column_dimensions[chr(64 + col_idx) if col_idx <= 26 else 'A'].width = 15

        # 保存到内存
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        response['Content-Disposition'] = f'attachment; filename="设备台账_{timestamp}.xlsx"'
        return response
