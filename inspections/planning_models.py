from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator,MaxValueValidator
class InspectionPlan(models.Model):
    code=models.CharField(max_length=50,unique=True)
    title=models.CharField(max_length=200)
    equipment=models.ForeignKey("assets.Asset",on_delete=models.PROTECT)
    template=models.ForeignKey("inspections.InspectionTemplate",on_delete=models.PROTECT)
    using_org=models.ForeignKey("users.Organization",on_delete=models.PROTECT)
    executor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    frequency_days=models.PositiveIntegerField(default=1,validators=[MinValueValidator(1),MaxValueValidator(3650)])
    start_date=models.DateField()
    end_date=models.DateField(null=True,blank=True)
    is_active=models.BooleanField(default=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="+")
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:ordering=["-created_at"]

class InspectionTask(models.Model):
    plan=models.ForeignKey(InspectionPlan,on_delete=models.PROTECT,related_name="tasks")
    scheduled_date=models.DateField()
    due_at=models.DateTimeField()
    executor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    template_snapshot=models.JSONField(default=list)
    status=models.CharField(max_length=20,default="pending",choices=[("pending","待执行"),("completed","已完成"),("canceled","已取消")])
    completed_at=models.DateTimeField(null=True,blank=True)
    class Meta:
        ordering=["-scheduled_date","-id"]
        constraints=[models.UniqueConstraint(fields=["plan","scheduled_date"],name="unique_inspection_plan_date")]

class InspectionIssue(models.Model):
    record=models.ForeignKey("inspections.InspectionRecord",on_delete=models.PROTECT,related_name="issues")
    item_code=models.CharField(max_length=100)
    severity=models.CharField(max_length=20,default="warning")
    blocks_release=models.BooleanField(default=True)
    status=models.CharField(max_length=30,default="open",choices=[("open","待处理"),("pending_verification","待复核"),("resolved","已解决")])
    work_order=models.ForeignKey("workorders.WorkOrder",null=True,blank=True,on_delete=models.PROTECT)
    resolved_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.PROTECT)
    resolved_at=models.DateTimeField(null=True,blank=True)
    resolution_note=models.TextField(blank=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["record","item_code"],name="unique_record_issue_item")]
