from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Assets app
"""
from django.contrib import admin
from .models import Asset, AssetStatus


@admin.register(Asset)
class AssetAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for Asset model"""
    list_display = ['code', 'name', 'process', 'factory', 'workshop', 'line', 'station', 'status', 'created_at']
    list_filter = ['status', 'factory', 'workshop', 'criticality', 'created_at']
    search_fields = ['code', 'name', 'equipment_id', 'serial_number', 'vendor']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'process', 'equipment_id', 'machine_name')
        }),
        ('Location', {
            'fields': ('factory', 'workshop', 'line', 'station', 'location_path')
        }),
        ('Equipment Details', {
            'fields': ('vendor', 'model', 'serial_number', 'specification')
        }),
        ('Warranty & Status', {
            'fields': ('start_date', 'warranty_expiry', 'status', 'parent', 'criticality')
        }),
        ('Financial', {
            'fields': ('cost_center', 'asset_value', 'expected_life_years')
        }),
        ('Meter & Maintenance', {
            'fields': ('current_meter_reading', 'meter_unit', 'last_maintenance_date', 'next_maintenance_date')
        }),
        ('Notes', {
            'fields': ('notes',)
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
