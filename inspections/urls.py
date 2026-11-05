from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import TemplateViewSet,PlanViewSet,TaskViewSet,RecordViewSet,IssueViewSet
router=DefaultRouter()
for prefix,cls,name in [("templates",TemplateViewSet,"inspection-template"),("plans",PlanViewSet,"inspection-plan"),("tasks",TaskViewSet,"inspection-task"),("issues",IssueViewSet,"inspection-issue"),("",RecordViewSet,"inspection")]:router.register(prefix,cls,basename=name)
urlpatterns=[path("",include(router.urls))]
