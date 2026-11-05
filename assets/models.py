"""
Asset (Equipment) models for CMMS
Equipment register / Asset management
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

User = get_user_model()


class AssetStatus(models.TextChoices):
    """Asset status choices"""
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    RETIRED = 'retired', 'Retired'
    MAINTENANCE = 'maintenance', 'Under Maintenance'


class Asset(models.Model):

    equipment_category = models.CharField(max_length=50, null=True, blank=True, choices=[("elevator","电梯"),("boiler","锅炉"),("pressure_vessel","压力容器"),("pressure_pipeline","压力管道"),("crane","起重机械"),("passenger_ropeway","客运索道"),("amusement","大型游乐设施"),("special_vehicle","场内专用机动车辆")])
    subcategory = models.CharField(max_length=100, null=True, blank=True)
    using_organization = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True)
    responsible_person = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    installation_organization = models.ForeignKey("users.Organization", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    installation_location = models.CharField(max_length=255, null=True, blank=True)
    lifecycle_stage = models.CharField(max_length=30, null=True, blank=True)
    last_examination_date = models.DateField(null=True, blank=True)
    next_examination_date = models.DateField(null=True, blank=True)
    examination_due_source = models.CharField(max_length=30, default="manual_demo")
    rule_reference = models.CharField(max_length=255, blank=True)
    rule_version = models.CharField(max_length=50, blank=True)
    rule_confirmation = models.CharField(max_length=30, default="unconfirmed")
    is_demo = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=0)

    """
    Asset/Equipment model - represents equipment in the maintenance system
    Supports hierarchical structure with parent-child relationships
    """
    id = models.BigAutoField(primary_key=True)
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name='Asset Code',
        help_text='Unique asset code'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='Asset Name'
    )
    process = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Process',
        help_text='Process this asset belongs to'
    )
    equipment_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Equipment ID',
        help_text='Equipment ID from external system'
    )
    machine_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Machine Name'
    )
    location_path = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Location Path',
        help_text='Full location path: Factory/Workshop/Line/Station'
    )
    factory = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Factory'
    )
    workshop = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Workshop'
    )
    line = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Production Line'
    )
    station = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Station'
    )
    vendor = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Vendor/Manufacturer'
    )
    model = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Model'
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Serial Number'
    )
    specification = models.TextField(
        blank=True,
        null=True,
        verbose_name='Specification'
    )
    start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name='Start Date',
        help_text='Date when asset was commissioned'
    )
    warranty_expiry = models.DateField(
        blank=True,
        null=True,
        verbose_name='Warranty Expiry'
    )
    status = models.CharField(
        max_length=20,
        choices=AssetStatus.choices,
        default=AssetStatus.ACTIVE,
        verbose_name='Status'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Parent Asset',
        help_text='Parent asset for hierarchical structure'
    )
    criticality = models.CharField(
        max_length=20,
        choices=[
            ('critical', 'Critical'),
            ('important', 'Important'),
            ('normal', 'Normal'),
        ],
        default='normal',
        verbose_name='Criticality'
    )
    cost_center = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Cost Center'
    )
    asset_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Asset Value'
    )
    expected_life_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MaxValueValidator(100)],
        verbose_name='Expected Life (Years)'
    )
    current_meter_reading = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Current Meter Reading',
        help_text='Current counter value (e.g., running hours, production count)'
    )
    meter_unit = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Meter Unit',
        help_text='Unit for meter reading (e.g., hours, cycles, pieces)'
    )
    last_maintenance_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Last Maintenance Date'
    )
    next_maintenance_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Next Maintenance Date'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notes'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_assets',
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
        db_table = 'assets'
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        ordering = ['code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['status']),
            models.Index(fields=['factory', 'workshop', 'line']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def get_full_location(self):
        """Get full location path"""
        parts = [p for p in [self.factory, self.workshop, self.line, self.station] if p]
        return ' / '.join(parts) if parts else 'N/A'

    def is_overdue_for_maintenance(self):
        """Check if asset is overdue for maintenance"""
        if self.next_maintenance_date:
            from django.utils import timezone
            return self.next_maintenance_date < timezone.now().date()
        return False

    @property
    def level(self):
        """Get hierarchy level (0 for root assets)"""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level

from .lifecycle_models import AssetServiceAuthorization, DemoAdmissionProfile, LifecycleEvent
