from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Spare Parts app
"""
from django.contrib import admin
from .models import SparePart, PartTransaction, PurchaseRequest


@admin.register(SparePart)
class SparePartAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for SparePart model"""
    list_display = ['part_code', 'name', 'category', 'current_stock', 'min_stock', 'safety_stock', 'unit', 'lifecycle_status', 'created_at']
    list_filter = ['category', 'lifecycle_status', 'created_at']
    search_fields = ['part_code', 'name', 'description', 'spec', 'manufacturer', 'supplier']
    ordering = ['part_code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('part_code', 'name', 'description', 'spec', 'category', 'unit')
        }),
        ('Stock Information', {
            'fields': ('current_stock', 'safety_stock', 'min_stock', 'max_stock', 'reorder_quantity')
        }),
        ('Supplier Information', {
            'fields': ('manufacturer', 'supplier', 'supplier_part_code')
        }),
        ('Location', {
            'fields': ('location', 'shelf')
        }),
        ('Cost Information', {
            'fields': ('unit_cost', 'average_cost')
        }),
        ('Equipment Compatibility', {
            'fields': ('compatible_equipment', 'alternative_parts'),
            'classes': ('collapse',)
        }),
        ('Lead Time & Lifecycle', {
            'fields': ('lead_time_days', 'lifecycle_status')
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


@admin.register(PartTransaction)
class PartTransactionAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for PartTransaction model"""
    list_display = ['part', 'transaction_type', 'quantity', 'stock_before', 'stock_after', 'operator', 'related_work_order', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['part__part_code', 'part__name', 'reference', 'operator__username']
    ordering = ['-created_at']
    readonly_fields = ['stock_before', 'stock_after', 'created_at']


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for PurchaseRequest model"""
    list_display = ['pr_code', 'part', 'quantity', 'urgency', 'status', 'requested_by', 'created_at']
    list_filter = ['urgency', 'status', 'created_at']
    search_fields = ['pr_code', 'part__part_code', 'part__name', 'requested_by__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
