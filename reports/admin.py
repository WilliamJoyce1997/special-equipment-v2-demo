from users.admin_security import ReadOnlyBusinessAdmin
"""
Django Admin configuration for Reports app
"""
from django.contrib import admin
from .models import ScheduledReport, ReportRun


@admin.register(ScheduledReport)
class ScheduledReportAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for ScheduledReport model"""
    list_display = ['name', 'report_type', 'frequency', 'status', 'last_run_at', 'next_run_at', 'created_at']
    list_filter = ['report_type', 'frequency', 'status', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ReportRun)
class ReportRunAdmin(ReadOnlyBusinessAdmin, admin.ModelAdmin):
    """Admin interface for ReportRun model"""
    list_display = ['report_type', 'status', 'output_format', 'requested_by', 'started_at', 'completed_at', 'created_at']
    list_filter = ['report_type', 'status', 'output_format', 'created_at']
    search_fields = ['report_type', 'requested_by__username', 'output_file']
    ordering = ['-created_at']
    readonly_fields = ['scheduled_report', 'report_type', 'parameters', 'status', 'output_file', 'output_format',
                      'error_message', 'requested_by', 'started_at', 'completed_at', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
