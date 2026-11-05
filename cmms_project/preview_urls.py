from django.urls import path,include
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from cmms_project.urls import root_view
from cmms_project.preview_auth import PreviewTokenSerializer

class PreviewLoginView(TokenObtainPairView):
    serializer_class=PreviewTokenSerializer
    throttle_classes=[AnonRateThrottle]

urlpatterns=[
    path("",root_view),
    path("api/auth/login/",PreviewLoginView.as_view()),
    path("api/auth/",include("users.urls")),
    path("api/assets/",include("assets.urls")),
    path("api/maintenance/",include("maintenance.urls")),
    path("api/workorders/",include("workorders.urls")),
    path("api/inspections/",include("inspections.urls")),
    path("api/spareparts/",include("spareparts.urls")),
    path("api/reports/",include("reports.urls")),
]
