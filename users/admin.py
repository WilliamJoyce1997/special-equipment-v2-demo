"""
Django Admin configuration for Users app
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model"""
    list_display = ['username', 'email', 'full_name', 'role', 'department', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'department', 'created_at']
    search_fields = ['username', 'email', 'full_name', 'phone']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'full_name', 'phone', 'department')
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'full_name', 'email', 'phone', 'department')
        }),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuditLog model"""
    list_display = ['created_at', 'actor', 'action', 'entity_type', 'entity_id', 'entity_repr']
    list_filter = ['action', 'entity_type', 'created_at']
    search_fields = ['actor__username', 'entity_type', 'entity_repr']
    readonly_fields = ['actor', 'action', 'entity_type', 'entity_id', 'entity_repr', 'diff', 'ip_address', 'user_agent', 'created_at']
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

from .models import Organization, Membership
from .admin_security import UnitConfigurationAdmin
admin.site.register(Organization, UnitConfigurationAdmin)
admin.site.register(Membership, UnitConfigurationAdmin)
