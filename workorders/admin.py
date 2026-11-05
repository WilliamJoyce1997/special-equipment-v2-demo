from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Work Orders app
"""
from django.contrib import admin
from .models import WorkOrder, WorkOrderComment, WorkOrderPart


class WorkOrderPartInline(admin.TabularInline):
    """Inline admin for WorkOrderPart"""
    model = WorkOrderPart
    extra = 0
    readonly_fields = ['total_cost']


@admin.register(WorkOrder)
class WorkOrderAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for WorkOrder model"""
    list_display = ['wo_code', 'summary', 'equipment', 'wo_type', 'status', 'priority', 'assignee', 'created_at']
    list_filter = ['wo_type', 'status', 'priority', 'created_at']
    search_fields = ['wo_code', 'summary', 'equipment__code', 'equipment__name', 'assignee__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_cost']
    inlines = [WorkOrderPartInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('wo_code', 'equipment', 'wo_type', 'status', 'summary', 'description', 'priority')
        }),
        ('Assignment', {
            'fields': ('requested_by', 'assignee', 'assigned_at', 'assigned_by')
        }),
        ('Maintenance Plan', {
            'fields': ('maintenance_plan',),
            'classes': ('collapse',)
        }),
        ('Schedule', {
            'fields': ('planned_start', 'planned_end', 'actual_start', 'actual_end')
        }),
        ('Failure Analysis', {
            'fields': ('failure_code', 'root_cause', 'actions_taken'),
            'classes': ('collapse',)
        }),
        ('Checklist', {
            'fields': ('checklist',),
            'classes': ('collapse',)
        }),
        ('Time & Cost', {
            'fields': ('downtime_minutes', 'labor_hours', 'parts_cost', 'total_cost')
        }),
        ('Sign Off', {
            'fields': ('completed_by', 'completed_at', 'closed_by', 'closed_at')
        }),
        ('Attachments & Notes', {
            'fields': ('attachments', 'notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WorkOrderComment)
class WorkOrderCommentAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for WorkOrderComment model"""
    list_display = ['work_order', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['work_order__wo_code', 'author__username', 'comment']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(WorkOrderPart)
class WorkOrderPartAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for WorkOrderPart model"""
    list_display = ['work_order', 'part_code', 'part_name', 'quantity', 'unit', 'total_cost']
    search_fields = ['work_order__wo_code', 'part_code', 'part_name']
    ordering = ['work_order', 'part_code']
    readonly_fields = ['total_cost']
