from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.serializers import CustomTokenObtainPairSerializer

class PreviewJWTAuthentication(JWTAuthentication):
    def get_user(self,validated_token):
        user=super().get_user(validated_token)
        if user.is_staff or user.is_superuser or user.is_admin:
            raise AuthenticationFailed("管理员账户不允许用于公网预览")
        return user

class PreviewTokenSerializer(CustomTokenObtainPairSerializer):
    def validate(self,attrs):
        data=super().validate(attrs)
        if self.user.is_staff or self.user.is_superuser or self.user.is_admin:
            raise AuthenticationFailed("管理员账户不允许用于公网预览")
        return data
