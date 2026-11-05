from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

CAPABILITIES={"using","installation","maintenance","repair","testing","examination"}
def validate_capabilities(value):
    if not isinstance(value,list) or not value or not set(value)<=CAPABILITIES:raise ValidationError("单位能力值无效")

class Organization(models.Model):
    code=models.CharField(max_length=50,unique=True)
    name=models.CharField(max_length=200)
    capabilities=models.JSONField(default=list,validators=[validate_capabilities])
    is_active=models.BooleanField(default=True)
    is_demo=models.BooleanField(default=False)
    created_at=models.DateTimeField(auto_now_add=True)
    def __str__(self):return self.name

class Membership(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="memberships")
    organization=models.ForeignKey(Organization,on_delete=models.PROTECT,related_name="memberships")
    business_role=models.CharField(max_length=30,choices=[(x,x) for x in ["manager","operator","technician","tester","examiner","approver"]])
    is_active=models.BooleanField(default=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["user","organization","business_role"],name="unique_unit_member_role")]

class IdempotencyReceipt(models.Model):
    organization=models.ForeignKey(Organization,on_delete=models.PROTECT)
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    action=models.CharField(max_length=100)
    client_key=models.CharField(max_length=100)
    fingerprint=models.CharField(max_length=64)
    response=models.JSONField(default=dict)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["organization","actor","action","client_key"],name="unique_idempotency_receipt")]
