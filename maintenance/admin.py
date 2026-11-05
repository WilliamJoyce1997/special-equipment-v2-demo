from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Maintenance app
"""
from django.contrib import admin
from .models import MaintenancePlan, WorkOrderTemplate


@admin.register(MaintenancePlan)
class MaintenancePlanAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for MaintenancePlan model"""
    list_display = ['code', 'title', 'equipment', 'trigger_type', 'priority', 'is_active', 'last_generated_date', 'created_at']
    list_filter = ['trigger_type', 'priority', 'is_active', 'created_at']
    search_fields = ['code', 'title', 'equipment__code', 'equipment__name']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'equipment', 'title', 'description', 'is_active')
        }),
        ('Trigger Configuration', {
            'fields': ('trigger_type', 'frequency_value', 'frequency_unit', 'counter_name', 'counter_threshold')
        }),
        ('Checklist & Resources', {
            'fields': ('checklist_template', 'estimated_hours', 'estimated_cost', 'required_skills', 'priority')
        }),
        ('Tracking', {
            'fields': ('last_generated_date', 'last_counter_value')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(WorkOrderTemplate)
class WorkOrderTemplateAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for WorkOrderTemplate model"""
    list_display = ['code', 'name', 'work_order_type', 'is_active', 'created_at']
    list_filter = ['work_order_type', 'is_active', 'created_at']
    search_fields = ['code', 'name', 'description']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description', 'work_order_type', 'is_active')
        }),
        ('Template Details', {
            'fields': ('checklist_template', 'estimated_hours', 'required_skills')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
