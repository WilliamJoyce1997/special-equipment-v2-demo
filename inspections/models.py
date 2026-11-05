"""
Inspection models for CMMS
Equipment inspection and spot check records
"""
from django.db import models
from django.contrib.auth import get_user_model
from assets.models import Asset

User = get_user_model()


class InspectionResult(models.TextChoices):
    """Inspection result choices"""
    PASS = 'pass', 'Pass'
    FAIL = 'fail', 'Fail'
    WARNING = 'warning', 'Warning'


class InspectionRecord(models.Model):

    using_org = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True)
    task = models.OneToOneField("InspectionTask", null=True, blank=True, on_delete=models.PROTECT, related_name="record")
    performed_at = models.DateTimeField(null=True, blank=True)
    template_snapshot = models.JSONField(default=list)
    submitted_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    is_demo = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=0)
    idempotency_key = models.CharField(max_length=100, blank=True)
    request_fingerprint = models.CharField(max_length=64, blank=True)

    """
    Inspection Record - stores inspection/spot check results
    Supports threshold-based evaluation and automatic CM work order generation
    """
    id = models.BigAutoField(primary_key=True)
    equipment = models.ForeignKey(
        Asset,
        on_delete=models.PROTECT,
        related_name='inspection_records',
        verbose_name='Equipment'
    )
    route = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Route',
        help_text='Inspection route name if part of a route'
    )
    # Inspection items - JSON array of inspection data
    # Format: [{"item": "Temperature", "value": "75", "unit": "C", "threshold": "80", "ok": true},
    #          {"item": "Vibration", "value": "5.2", "unit": "mm/s", "threshold": "5.0", "ok": false}]
    items = models.JSONField(
        verbose_name='Inspection Items',
        help_text='JSON array of inspection items with values and results'
    )
    inspector = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='inspections',
        verbose_name='Inspector'
    )
    result = models.CharField(
        max_length=20,
        choices=InspectionResult.choices,
        default=InspectionResult.PASS,
        verbose_name='Overall Result'
    )
    # Auto-generated CM work order reference
    triggered_work_order = models.ForeignKey(
        'workorders.WorkOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_by_inspections',
        verbose_name='Triggered Work Order'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At',
        db_index=True
    )

    class Meta:
        db_table = 'inspection_records'
        verbose_name = 'Inspection Record'
        verbose_name_plural = 'Inspection Records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['equipment', 'created_at']),
            models.Index(fields=['inspector', 'created_at']),
            models.Index(fields=['result', 'created_at']),
        ]

    def __str__(self):
        return f"Inspection - {self.equipment.code} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def save(self, *args, **kwargs):
        # Auto-calculate result based on items
        if self.items:
            has_fail = any(not item.get('ok', True) for item in self.items)
            self.result = InspectionResult.FAIL if has_fail else InspectionResult.WARNING if any(item.get('result')=='attention' for item in self.items) else InspectionResult.PASS
        super().save(*args, **kwargs)


class InspectionTemplate(models.Model):
    organization = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True)

    """
    Inspection Template - reusable template for inspections
    Defines what items to inspect and their thresholds
    """
    id = models.BigAutoField(primary_key=True)
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Template Code'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='Template Name'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    # Template items - JSON array defining inspection items
    # Format: [{"item": "Temperature", "unit": "C", "threshold": "80", "min": 0, "max": 100}]
    items_template = models.JSONField(
        verbose_name='Items Template',
        help_text='JSON array defining inspection items structure'
    )
    equipment_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Equipment Type',
        help_text='Type of equipment this template applies to'
    )
    frequency_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Frequency (Days)',
        help_text='How often this inspection should be performed'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Active'
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
        db_table = 'inspection_templates'
        verbose_name = 'Inspection Template'
        verbose_name_plural = 'Inspection Templates'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class InspectionRoute(models.Model):
    """
    Inspection Route - defines a sequence of equipment to inspect
    Used for organizing regular inspection rounds
    """
    id = models.BigAutoField(primary_key=True)
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Route Code'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='Route Name'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    # Route items - JSON array defining the sequence
    # Format: [{"sequence": 1, "equipment_id": 123, "template_id": 5}]
    route_items = models.JSONField(
        verbose_name='Route Items',
        help_text='JSON array defining equipment sequence and templates'
    )
    estimated_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Estimated Duration (Minutes)'
    )
    inspector = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='inspection_routes',
        null=True,
        blank=True,
        verbose_name='Default Inspector'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Active'
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
        db_table = 'inspection_routes'
        verbose_name = 'Inspection Route'
        verbose_name_plural = 'Inspection Routes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

from .planning_models import InspectionPlan, InspectionTask, InspectionIssue
