"""
Work Order models for CMMS
PM, CM, and Inspection work orders
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth import get_user_model
from assets.models import Asset
from maintenance.models import MaintenancePlan

User = get_user_model()


class WorkOrderType(models.TextChoices):
    """Work order types"""
    PM = 'PM', 'Preventive Maintenance'
    CM = 'CM', 'Corrective Maintenance'
    INSPECTION = 'inspection', 'Inspection'


class WorkOrderStatus(models.TextChoices):
    """Work order status"""
    OPEN = 'open', 'Open'
    ASSIGNED = 'assigned', 'Assigned'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CLOSED = 'closed', 'Closed'
    CANCELED = 'canceled', 'Canceled'


class Priority(models.TextChoices):
    """Priority levels"""
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    CRITICAL = 'critical', 'Critical'


class WorkOrder(models.Model):

    requesting_org = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True)
    service_org = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    accepted_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    accepted_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=0)
    is_demo = models.BooleanField(default=False)
    generation_key = models.CharField(max_length=160, null=True, blank=True, unique=True)

    """
    Work Order - main entity for maintenance work
    Supports PM (Preventive Maintenance), CM (Corrective Maintenance), and Inspections
    """
    id = models.BigAutoField(primary_key=True)
    wo_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name='Work Order Code'
    )
    equipment = models.ForeignKey(
        Asset,
        on_delete=models.PROTECT,
        related_name='work_orders',
        verbose_name='Equipment'
    )
    wo_type = models.CharField(
        max_length=20,
        choices=WorkOrderType.choices,
        default=WorkOrderType.CM,
        verbose_name='Work Order Type'
    )
    status = models.CharField(
        max_length=20,
        choices=WorkOrderStatus.choices,
        default=WorkOrderStatus.OPEN,
        verbose_name='Status',
        db_index=True
    )
    summary = models.CharField(
        max_length=200,
        verbose_name='Summary'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        verbose_name='Priority'
    )
    # Request and assignment
    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='requested_work_orders',
        verbose_name='Requested By'
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='assigned_work_orders',
        null=True,
        blank=True,
        verbose_name='Assigned To'
    )
    assigned_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Assigned At'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='assignments_made',
        null=True,
        blank=True,
        verbose_name='Assigned By'
    )
    # Maintenance plan reference for PM work orders
    maintenance_plan = models.ForeignKey(
        MaintenancePlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_orders',
        verbose_name='Maintenance Plan'
    )
    # Schedule
    planned_start = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Planned Start'
    )
    planned_end = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Planned End'
    )
    actual_start = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Actual Start'
    )
    actual_end = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Actual End'
    )
    # Failure analysis (for CM work orders)
    failure_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Failure Code'
    )
    root_cause = models.TextField(
        blank=True,
        null=True,
        verbose_name='Root Cause'
    )
    actions_taken = models.TextField(
        blank=True,
        null=True,
        verbose_name='Actions Taken'
    )
    # Checklist - JSON array of checklist items with results
    checklist = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Checklist',
        help_text='Checklist items with results'
    )
    # Time and cost tracking
    downtime_minutes = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Downtime (Minutes)'
    )
    labor_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Labor Hours'
    )
    parts_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Parts Cost'
    )
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Total Cost'
    )
    # Sign off
    completed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='completed_work_orders',
        null=True,
        blank=True,
        verbose_name='Completed By'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Completed At'
    )
    closed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='closed_work_orders',
        null=True,
        blank=True,
        verbose_name='Closed By'
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Closed At'
    )
    # Attachments and notes
    attachments = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Attachments'
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
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        db_table = 'work_orders'
        verbose_name = 'Work Order'
        verbose_name_plural = 'Work Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wo_code']),
            models.Index(fields=['equipment', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['wo_type', 'status']),
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['priority', 'status']),
        ]

    def __str__(self):
        return f"{self.wo_code} - {self.summary}"

    def save(self, *args, **kwargs):
        # Auto-generate work order code if not provided
        if not self.wo_code:
            from django.utils import timezone
            today = timezone.now().strftime('%Y%m%d')
            # Get the last work order for today
            last_wo = WorkOrder.objects.filter(
                wo_code__startswith=f'WO-{today}-'
            ).order_by('-wo_code').first()
            
            if last_wo:
                # Extract sequence number and increment
                try:
                    last_seq = int(last_wo.wo_code.split('-')[-1])
                    seq = last_seq + 1
                except (ValueError, IndexError):
                    seq = 1
            else:
                seq = 1
            
            self.wo_code = f'WO-{today}-{seq:03d}'
        
        # Auto-calculate total cost
        self.total_cost = self.parts_cost
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if work order is overdue"""
        if self.planned_end and self.status not in [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELED]:
            from django.utils import timezone
            return timezone.now() > self.planned_end
        return False

    @property
    def duration_hours(self):
        """Calculate actual duration in hours"""
        if self.actual_start and self.actual_end:
            delta = self.actual_end - self.actual_start
            return delta.total_seconds() / 3600
        return 0

    def can_be_assigned(self):
        """Check if work order can be assigned"""
        return self.status == WorkOrderStatus.OPEN

    def can_be_started(self):
        """Check if work order can be started"""
        return self.status in [WorkOrderStatus.ASSIGNED, WorkOrderStatus.OPEN]

    def can_be_completed(self):
        """Check if work order can be completed"""
        return self.status == WorkOrderStatus.IN_PROGRESS

    def can_be_closed(self):
        """Check if work order can be closed"""
        return self.status == WorkOrderStatus.COMPLETED


class WorkOrderComment(models.Model):

    actor_org = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True)
    event_kind = models.CharField(max_length=30, default="progress")
    performed_at = models.DateTimeField(null=True, blank=True)

    """Comments and communication on work orders"""
    id = models.BigAutoField(primary_key=True)
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Work Order'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='work_order_comments',
        verbose_name='Author'
    )
    comment = models.TextField(
        verbose_name='Comment'
    )
    is_internal = models.BooleanField(
        default=True,
        verbose_name='Internal Only'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )

    class Meta:
        db_table = 'work_order_comments'
        verbose_name = 'Work Order Comment'
        verbose_name_plural = 'Work Order Comments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.work_order.wo_code} - {self.author.username} - {self.created_at}"


class WorkOrderPart(models.Model):
    """Parts used in work orders"""
    id = models.BigAutoField(primary_key=True)
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='parts_used',
        verbose_name='Work Order'
    )
    part_code = models.CharField(
        max_length=50,
        verbose_name='Part Code'
    )
    part_name = models.CharField(
        max_length=200,
        verbose_name='Part Name'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Quantity'
    )
    unit = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Unit'
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Unit Cost'
    )
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Total Cost'
    )

    class Meta:
        db_table = 'work_order_parts'
        verbose_name = 'Work Order Part'
        verbose_name_plural = 'Work Order Parts'
        ordering = ['part_code']

    def __str__(self):
        return f"{self.work_order.wo_code} - {self.part_name} x{self.quantity}"

    def save(self, *args, **kwargs):
        # Auto-calculate total cost
        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)
