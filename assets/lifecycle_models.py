from django.db import models
from django.conf import settings
class AssetServiceAuthorization(models.Model):
    asset=models.ForeignKey("assets.Asset",on_delete=models.PROTECT,related_name="service_authorizations")
    service_org=models.ForeignKey("users.Organization",on_delete=models.PROTECT)
    service_kind=models.CharField(max_length=30,choices=[(x,x) for x in ["maintenance","repair","installation","testing","examination","inspection"]])
    valid_from=models.DateField(null=True,blank=True)
    valid_until=models.DateField(null=True,blank=True)
    is_active=models.BooleanField(default=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["asset","service_org","service_kind"],name="unique_asset_service_authorization")]

class DemoAdmissionProfile(models.Model):
    organization=models.ForeignKey("users.Organization",on_delete=models.PROTECT)
    version=models.CharField(max_length=50)
    confirmed_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    confirmed_at=models.DateTimeField()
    conditions=models.JSONField(default=dict)
    is_active=models.BooleanField(default=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["organization","version"],name="unique_demo_admission_version")]

class LifecycleEvent(models.Model):
    asset=models.ForeignKey("assets.Asset",on_delete=models.PROTECT,related_name="lifecycle_events")
    event_type=models.CharField(max_length=50)
    occurred_at=models.DateTimeField()
    recorded_at=models.DateTimeField(auto_now_add=True)
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.PROTECT)
    actor_org=models.ForeignKey("users.Organization",null=True,on_delete=models.PROTECT)
    source_type=models.CharField(max_length=50)
    source_id=models.PositiveBigIntegerField()
    source_action=models.CharField(max_length=100)
    summary=models.CharField(max_length=255)
    payload_snapshot=models.JSONField(default=dict)
    is_demo=models.BooleanField(default=False)
    is_historical=models.BooleanField(default=False)
    class Meta:
        ordering=["-occurred_at","-id"]
        indexes=[models.Index(fields=["asset","occurred_at","id"],name="asset_event_time_idx")]
        constraints=[models.UniqueConstraint(fields=["source_type","source_id","source_action"],name="unique_lifecycle_source_action")]
