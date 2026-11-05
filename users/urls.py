"""
URL configuration for Users app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import UserViewSet, AuditLogViewSet, OrganizationViewSet, MembershipViewSet
from .serializers import CustomTokenObtainPairSerializer


# Custom login view with extra user info
class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view with additional user info"""
    serializer_class = CustomTokenObtainPairSerializer


router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'memberships', MembershipViewSet, basename='membership')
router.register(r'users', UserViewSet, basename='user')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    # Authentication endpoints
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # ViewSet routes
    path('', include(router.urls)),
]
