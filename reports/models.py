"""
Reports models for CMMS
Report configurations and scheduled reports
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ScheduledReport(models.Model):
    """
    Scheduled Report - configuration for automated reports
    """
    REPORT_TYPE_CHOICES = [
        ('workorder_summary', 'Work Order Summary'),
        ('downtime_analysis', 'Downtime Analysis'),
        ('spareparts_usage', 'Spare Parts Usage'),
        ('maintenance_compliance', 'Maintenance Compliance'),
        ('cost_analysis', 'Cost Analysis'),
        ('technician_performance', 'Technician Performance'),
        ('equipment_availability', 'Equipment Availability'),
    ]

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('disabled', 'Disabled'),
    ]

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(
        max_length=200,
        verbose_name='Report Name'
    )
    report_type = models.CharField(
        max_length=50,
        choices=REPORT_TYPE_CHOICES,
        verbose_name='Report Type'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        verbose_name='Frequency'
    )
    # Report parameters stored as JSON
    parameters = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Parameters',
        help_text='Report-specific parameters and filters'
    )
    # Recipients
    recipients = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Recipients',
        help_text='List of email addresses to send report to'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Status'
    )
    # Last run info
    last_run_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Last Run At'
    )
    next_run_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Next Run At'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_scheduled_reports',
        verbose_name='Created By'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        db_table = 'scheduled_reports'
        verbose_name = 'Scheduled Report'
        verbose_name_plural = 'Scheduled Reports'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"


class ReportRun(models.Model):
    """
    Report Run - history of report executions
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.BigAutoField(primary_key=True)
    scheduled_report = models.ForeignKey(
        ScheduledReport,
        on_delete=models.CASCADE,
        related_name='runs',
        null=True,
        blank=True,
        verbose_name='Scheduled Report'
    )
    report_type = models.CharField(
        max_length=50,
        verbose_name='Report Type'
    )
    parameters = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Parameters'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Status'
    )
    # File output
    output_file = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Output File'
    )
    output_format = models.CharField(
        max_length=10,
        choices=[
            ('pdf', 'PDF'),
            ('xlsx', 'Excel'),
            ('csv', 'CSV'),
        ],
        null=True,
        blank=True,
        verbose_name='Output Format'
    )
    # Error info
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='Error Message'
    )
    # Requested by (for ad-hoc reports)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='requested_reports',
        null=True,
        blank=True,
        verbose_name='Requested By'
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Started At'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Completed At'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )

    class Meta:
        db_table = 'report_runs'
        verbose_name = 'Report Run'
        verbose_name_plural = 'Report Runs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.report_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def duration_seconds(self):
        """Calculate report generation duration"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return 0
