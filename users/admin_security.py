from django.contrib import admin
from .access import platform
class ReadOnlyBusinessAdmin:
    def has_view_permission(self,request,obj=None):return platform(request.user)
    def has_add_permission(self,request):return False
    def has_change_permission(self,request,obj=None):return False
    def has_delete_permission(self,request,obj=None):return False
class UnitConfigurationAdmin(admin.ModelAdmin):
    def has_view_permission(self,request,obj=None):return platform(request.user)
    def has_add_permission(self,request):return platform(request.user)
    def has_change_permission(self,request,obj=None):return platform(request.user)
    def has_delete_permission(self,request,obj=None):return False
    def save_model(self,request,obj,form,change):
        from .models import AuditLog
        super().save_model(request,obj,form,change)
        AuditLog.log(actor=request.user,action="update" if change else "create",entity_type=type(obj).__name__,entity_id=obj.pk,entity_repr=str(obj))
