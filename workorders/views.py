import csv,io
from datetime import datetime
from django.http import HttpResponse
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment
from rest_framework import viewsets,filters,status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError,PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from users.access import current_org,require_manager,order_scope,has_role
from assets.services import event
from .models import WorkOrder,WorkOrderComment,WorkOrderPart,WorkOrderStatus,WorkOrderType
from .serializers import WorkOrderSerializer,WorkOrderListSerializer,WorkOrderCommentSerializer,WorkOrderPartSerializer
from .services import create_order,move_order,executor

class WorkOrderViewSet(viewsets.ModelViewSet):
    permission_classes=[IsAuthenticated]
    serializer_class=WorkOrderSerializer
    filter_backends=[DjangoFilterBackend,filters.SearchFilter,filters.OrderingFilter]
    filterset_fields=["wo_type","status","priority","equipment","assignee","service_org"]
    search_fields=["wo_code","summary","description"]
    ordering_fields=["created_at","planned_start","priority"]
    ordering=["-created_at"]
    def get_queryset(self):
        return order_scope(self.request).select_related("equipment","assignee","requested_by","service_org").prefetch_related("comments")
    def perform_create(self,serializer):
        wo=create_order(self.request,serializer.validated_data);serializer.instance=wo
    @transaction.atomic
    def perform_update(self,serializer):
        require_manager(self.request,serializer.instance.equipment)
        if serializer.instance.status not in ["open","assigned"]:raise ValidationError("执行中及终态工单只允许通过过程或受控动作更新")
        wo=serializer.save(version=serializer.instance.version+1)
        event(wo.equipment,self.request.user,current_org(self.request),"workorder_updated",wo,f"updated:{wo.version}","更新任务资料")
    def perform_destroy(self,instance):
        require_manager(self.request,instance.equipment)
        raise ValidationError("工单履历必须保留，请使用取消任务")
    def _move(self,request,action_name):
        return Response(WorkOrderSerializer(move_order(request,self.get_object(),action_name,request.data),context={"request":request}).data)
    @action(detail=True,methods=["post"])
    def assign(self,request,pk=None):return self._move(request,"assign")
    @action(detail=True,methods=["post"])
    def accept(self,request,pk=None):return self._move(request,"accept")
    @action(detail=True,methods=["post"])
    def start(self,request,pk=None):return self._move(request,"start")
    @action(detail=True,methods=["post"])
    def complete(self,request,pk=None):return self._move(request,"complete")
    @action(detail=True,methods=["post"])
    def close(self,request,pk=None):return self._move(request,"close")
    @action(detail=True,methods=["post"])
    def cancel(self,request,pk=None):return self._move(request,"cancel")
    @action(detail=False,methods=["get"])
    def my_orders(self,request):
        return Response(WorkOrderSerializer(self.get_queryset().filter(assignee=request.user),many=True,context={"request":request}).data)
    @action(detail=False,methods=["get"])
    def overdue(self,request):
        return Response(WorkOrderSerializer(self.get_queryset().filter(planned_end__lt=timezone.now()).exclude(status__in=["completed","closed","canceled"]),many=True,context={"request":request}).data)

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Download Excel template for work order import"""
        wb = Workbook()
        ws = wb.active
        ws.title = "工单导入模板"

        # 表头样式
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")

        # 定义表头
        headers = [
            ('equipment_code', '设备编码*', '必填'),
            ('summary', '工单摘要*', '必填'),
            ('description', '工单描述', ''),
            ('wo_type', '工单类型', 'PM/CM/inspection'),
            ('priority', '优先级', 'low/medium/high/critical'),
            ('planned_start', '计划开始时间', '格式: YYYY-MM-DD HH:MM'),
            ('planned_end', '计划结束时间', '格式: YYYY-MM-DD HH:MM'),
            ('failure_code', '故障代码', ''),
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
        column_widths = [18, 25, 30, 15, 15, 20, 20, 15, 30]
        for col_idx, width in enumerate(column_widths, 1):
            ws.column_dimensions[chr(64 + col_idx)].width = width

        # 添加示例数据
        example_data = [
            'EQ-001', '设备异响维修', '运行时有异响，需要检查', 'CM', 'high',
            '2024-01-15 09:00', '2024-01-15 17:00', 'M-001', '紧急维修'
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
        response['Content-Disposition'] = 'attachment; filename="工单导入模板.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        """Import work orders from Excel or CSV file"""
        from assets.models import Asset

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
        import openpyxl
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
            '设备编码': 'equipment_code',
            '工单摘要': 'summary',
            '工单描述': 'description',
            '工单类型': 'wo_type',
            '优先级': 'priority',
            '计划开始时间': 'planned_start',
            '计划结束时间': 'planned_end',
            '故障代码': 'failure_code',
            '备注': 'notes',
        }
        # 同时支持英文字段名
        for field in list(header_map.values()):
            header_map[field] = field
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
        """Process imported data and create work orders"""
        from assets.models import Asset

        success_count = 0
        error_count = 0
        errors = []

        for item in data:
            row_num = item['row_num']
            wo_data = item['data']

            try:
                # 验证必填字段
                equipment_code = wo_data.get('equipment_code')
                if not equipment_code:
                    errors.append(f"第{row_num}行: 设备编码不能为空")
                    error_count += 1
                    continue

                summary = wo_data.get('summary')
                if not summary:
                    errors.append(f"第{row_num}行: 工单摘要不能为空")
                    error_count += 1
                    continue

                # 查找设备
                try:
                    equipment = Asset.objects.get(code=equipment_code)
                except Asset.DoesNotExist:
                    errors.append(f"第{row_num}行: 设备编码 '{equipment_code}' 不存在")
                    error_count += 1
                    continue

                # 处理日期时间字段
                for date_field in ['planned_start', 'planned_end']:
                    value = wo_data.get(date_field)
                    if value:
                        if isinstance(value, datetime):
                            wo_data[date_field] = value
                        elif isinstance(value, str):
                            try:
                                wo_data[date_field] = datetime.strptime(value, '%Y-%m-%d %H:%M')
                            except ValueError:
                                try:
                                    wo_data[date_field] = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                                except ValueError:
                                    try:
                                        wo_data[date_field] = datetime.strptime(value, '%Y-%m-%d')
                                    except ValueError:
                                        errors.append(f"第{row_num}行: {date_field} 日期时间格式错误，应为 YYYY-MM-DD HH:MM")
                                        error_count += 1
                                        continue

                # 设置默认值
                wo_data.setdefault('wo_type', 'CM')
                wo_data.setdefault('priority', 'medium')
                wo_data['equipment'] = equipment
                wo_data['requested_by'] = user

                # 清理不需要的字段
                wo_data.pop('equipment_code', None)

                # 创建工单
                WorkOrder.objects.create(**wo_data)
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
        """Export work orders to Excel file"""
        work_orders = self.filter_queryset(self.get_queryset())

        wb = Workbook()
        ws = wb.active
        ws.title = "工单列表"

        # 表头
        headers = [
            '工单号', '设备编码', '设备名称', '工单类型', '摘要', '描述',
            '优先级', '状态', '负责人', '计划开始', '计划结束',
            '实际开始', '实际结束', '故障代码', '根本原因',
            '停机时间(分钟)', '人工工时', '备件成本', '备注', '创建时间'
        ]

        # 写入表头
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            cell.alignment = Alignment(horizontal='center', vertical='center')

        # 写入数据
        for row_idx, wo in enumerate(work_orders, 2):
            ws.cell(row=row_idx, column=1, value=wo.wo_code or '')
            ws.cell(row=row_idx, column=2, value=wo.equipment.code if wo.equipment else '')
            ws.cell(row=row_idx, column=3, value=wo.equipment.name if wo.equipment else '')
            ws.cell(row=row_idx, column=4, value=wo.get_wo_type_display() or '')
            ws.cell(row=row_idx, column=5, value=wo.summary or '')
            ws.cell(row=row_idx, column=6, value=wo.description or '')
            ws.cell(row=row_idx, column=7, value=wo.get_priority_display() or '')
            ws.cell(row=row_idx, column=8, value=wo.get_status_display() or '')
            ws.cell(row=row_idx, column=9, value=wo.assignee.full_name if wo.assignee else '')
            ws.cell(row=row_idx, column=10, value=wo.planned_start.strftime('%Y-%m-%d %H:%M') if wo.planned_start else '')
            ws.cell(row=row_idx, column=11, value=wo.planned_end.strftime('%Y-%m-%d %H:%M') if wo.planned_end else '')
            ws.cell(row=row_idx, column=12, value=wo.actual_start.strftime('%Y-%m-%d %H:%M') if wo.actual_start else '')
            ws.cell(row=row_idx, column=13, value=wo.actual_end.strftime('%Y-%m-%d %H:%M') if wo.actual_end else '')
            ws.cell(row=row_idx, column=14, value=wo.failure_code or '')
            ws.cell(row=row_idx, column=15, value=wo.root_cause or '')
            ws.cell(row=row_idx, column=16, value=wo.downtime_minutes or 0)
            ws.cell(row=row_idx, column=17, value=float(wo.labor_hours) if wo.labor_hours else 0)
            ws.cell(row=row_idx, column=18, value=float(wo.parts_cost) if wo.parts_cost else 0)
            ws.cell(row=row_idx, column=19, value=wo.notes or '')
            ws.cell(row=row_idx, column=20, value=wo.created_at.strftime('%Y-%m-%d %H:%M') if wo.created_at else '')

        # 设置列宽
        for col_idx in range(1, 21):
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
        response['Content-Disposition'] = f'attachment; filename="工单列表_{timestamp}.xlsx"'
        return response



    def _process_import_data(self,data,user):
        success=0;errors=[]
        for item in data:
            values=item["data"]
            values.pop("status",None);values.pop("assignee",None);values.pop("requested_by",None);values.pop("wo_code",None)
            code=values.pop("equipment_code",None)
            if code:
                from users.access import asset_scope
                asset=asset_scope(self.request,owned=True).filter(code=code).first()
                values["equipment"]=asset.pk if asset else None
            try:
                serializer=WorkOrderSerializer(data=values,context={"request":self.request});serializer.is_valid(raise_exception=True);self.perform_create(serializer);success+=1
            except Exception as exc:errors.append("第"+str(item["row_num"])+"行："+str(exc))
        return {"success_count":success,"error_count":len(errors),"errors":errors[:20]}

class WorkOrderCommentViewSet(viewsets.ModelViewSet):
    serializer_class=WorkOrderCommentSerializer
    permission_classes=[IsAuthenticated]
    filter_backends=[DjangoFilterBackend];filterset_fields=["work_order","is_internal"]
    http_method_names=["get","post","head","options"]
    def get_queryset(self):
        org=current_org(self.request)
        return WorkOrderComment.objects.filter(work_order__in=order_scope(self.request)).filter(Q(is_internal=False)|Q(actor_org=org)).select_related("author").order_by("performed_at","id")
    @transaction.atomic
    def perform_create(self,serializer):
        wo=serializer.validated_data["work_order"]
        if wo.equipment.using_organization_id==getattr(current_org(self.request),"pk",None):require_manager(self.request,wo.equipment)
        else:executor(self.request,wo)
        if wo.status in ["closed","canceled"]:raise ValidationError("已关闭任务不能新增处理记录")
        comment=serializer.save(author=self.request.user,actor_org=current_org(self.request),performed_at=timezone.now())
        if not comment.is_internal:
            event(wo.equipment,self.request.user,current_org(self.request),"progress",comment,"created","处理过程："+comment.comment[:160])
        else:
            from users.models import AuditLog
            AuditLog.log(actor=self.request.user,action="create",entity_type="WorkOrderComment",entity_id=comment.pk,diff={"is_internal":True,"organization":comment.actor_org_id})

class WorkOrderPartViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=WorkOrderPartSerializer;permission_classes=[IsAuthenticated]
    filter_backends=[DjangoFilterBackend];filterset_fields=["work_order"]
    def get_queryset(self):return WorkOrderPart.objects.filter(work_order__in=order_scope(self.request))
