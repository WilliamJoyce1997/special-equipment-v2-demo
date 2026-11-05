from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Inspections app
"""
from django.contrib import admin
from .models import InspectionRecord, InspectionTemplate, InspectionRoute


@admin.register(InspectionRecord)
class InspectionRecordAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for InspectionRecord model"""
    list_display = ['equipment', 'inspector', 'result', 'route', 'created_at']
    list_filter = ['result', 'created_at']
    search_fields = ['equipment__code', 'equipment__name', 'inspector__username', 'route']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(InspectionTemplate)
class InspectionTemplateAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for InspectionTemplate model"""
    list_display = ['code', 'name', 'equipment_type', 'frequency_days', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name', 'description', 'equipment_type']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InspectionRoute)
class InspectionRouteAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for InspectionRoute model"""
    list_display = ['code', 'name', 'inspector', 'estimated_duration_minutes', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name', 'description']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']
