from django.urls import path
from . import views
urlpatterns=[path("overview/",views.overview),path("workorders/",views.workorders),path("inspections/",views.inspections),path("examinations/",views.examinations)]
