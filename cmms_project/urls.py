"""
URL configuration for CMMS project.
Computerized Maintenance Management System / Total Productive Maintenance
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import redirect


def root_view(request):
    """根路径跳转到登录页面"""
    # 如果是API请求，返回API信息
    if request.path.startswith('/api/'):
        return JsonResponse({
            "name": "CMMS - 设备维护保养系统",
            "version": "1.0.0",
            "message": "API is running. Please use /static/login.html for web interface."
        })
    # 否则跳转到登录页面
    return redirect('/static/login.html')


admin.site.has_permission = lambda request: bool(request.user.is_authenticated and request.user.is_staff and request.user.is_admin)

def demo_info(request):
    import os
    from pathlib import Path
    db=Path(settings.DATABASES["default"]["NAME"]).resolve()
    isolated=(db==(settings.BASE_DIR/".local"/"demo.sqlite3").resolve() and os.environ.get("CMMS_DEMO_MODE")=="1")
    return JsonResponse({"isolated_demo":isolated,"schema":"P0"},status=200 if isolated else 403)

urlpatterns = [
    path('', root_view, name='root'),
    path('api/demo-info/',demo_info),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/assets/', include('assets.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    path('api/workorders/', include('workorders.urls')),
    path('api/inspections/', include('inspections.urls')),
    path('api/spareparts/', include('spareparts.urls')),
    path('api/reports/', include('reports.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # 使用STATICFILES_DIRS而不是STATIC_ROOT来提供静态文件
    from pathlib import Path
    static_dir = Path(__file__).resolve().parent.parent / 'static'
    urlpatterns += static('static/', document_root=str(static_dir))
