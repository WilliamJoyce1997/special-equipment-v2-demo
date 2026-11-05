"""
User models for CMMS - RBAC implementation
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class Role(models.TextChoices):
    """User roles for RBAC"""
    ADMIN = 'admin', 'Administrator'
    SUPERVISOR = 'supervisor', 'Supervisor'
    ENGINEER = 'engineer', 'Engineer'
    TECHNICIAN = 'technician', 'Technician'
    OPERATOR = 'operator', 'Operator'


class User(AbstractUser):
    """
    Custom User model with RBAC roles
    Extends Django's AbstractUser to add role-based access control
    """
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.OPERATOR,
        verbose_name='Role',
        help_text='User role determining permissions'
    )
    full_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Full Name'
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='Email'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
            )
        ],
        verbose_name='Phone Number'
    )
    department = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Department'
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
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        """Check if user is admin"""
        return self.is_active and (self.is_superuser or (self.is_staff and self.role == Role.ADMIN))

    @property
    def is_supervisor(self):
        """Check if user is supervisor or higher"""
        return self.role in [Role.ADMIN, Role.SUPERVISOR]

    @property
    def is_engineer(self):
        """Check if user is engineer or higher"""
        return self.role in [Role.ADMIN, Role.SUPERVISOR, Role.ENGINEER]

    def has_role(self, *roles):
        """Check if user has any of the specified roles"""
        return self.role in roles


class AuditLog(models.Model):
    """
    Audit log for tracking all critical operations
    Records who did what, when, and what changed
    """
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('assign', 'Assign'),
        ('complete', 'Complete'),
        ('close', 'Close'),
        ('cancel', 'Cancel'),
        ('sign_off', 'Sign Off'),
        ('stock_in', 'Stock In'),
        ('stock_out', 'Stock Out'),
        ('stock_adjust', 'Stock Adjust'),
    ]

    id = models.BigAutoField(primary_key=True)
    actor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='audit_logs',
        verbose_name='Actor'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='Action'
    )
    entity_type = models.CharField(
        max_length=50,
        verbose_name='Entity Type',
        help_text='Type of entity affected (e.g., WorkOrder, Asset, SparePart)'
    )
    entity_id = models.PositiveIntegerField(
        verbose_name='Entity ID',
        help_text='ID of the affected entity'
    )
    entity_repr = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Entity Representation',
        help_text='String representation of the entity'
    )
    diff = models.JSONField(
        default=dict,
        verbose_name='Changes',
        help_text='JSON representation of changes made'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP Address'
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At',
        db_index=True
    )

    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['action', 'created_at']),
        ]

    def __str__(self):
        return f"{self.actor} - {self.action} - {self.entity_type}:{self.entity_id} - {self.created_at}"

    @classmethod
    def log(cls, actor, action, entity_type, entity_id, entity_repr='', diff=None, **kwargs):
        """
        Create an audit log entry

        Args:
            actor: User who performed the action
            action: Action performed
            entity_type: Type of entity affected
            entity_id: ID of the entity
            entity_repr: String representation of the entity
            diff: Dictionary of changes made
            **kwargs: Additional fields (ip_address, user_agent)
        """
        return cls.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_repr=entity_repr,
            diff=diff or {},
            **kwargs
        )

from .unit_models import Organization, Membership, IdempotencyReceipt
