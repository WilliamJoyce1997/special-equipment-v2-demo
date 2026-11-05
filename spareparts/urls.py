"""
URL configuration for Spare Parts app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SparePartViewSet


router = DefaultRouter()
router.register(r'', SparePartViewSet, basename='sparepart')

urlpatterns = [
    path('', include(router.urls)),
]
