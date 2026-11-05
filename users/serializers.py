"""
Serializers for Users app
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, AuditLog, Role


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    password = serializers.CharField(write_only=True, required=False, min_length=10, style={'input_type': 'password'})
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    memberships = serializers.SerializerMethodField()
    platform_admin = serializers.BooleanField(source='is_admin',read_only=True)
    def get_memberships(self,obj):
        qs=obj.memberships.filter(is_active=True,organization__is_active=True)
        request=self.context.get("request")
        if request and request.user.pk!=obj.pk and not request.user.is_admin:
            from .access import current_org
            qs=qs.filter(organization=current_org(request))
        return list(qs.values('organization','organization__name','business_role'))
    def update(self,instance,validated_data):
        password=validated_data.pop('password',None)
        instance=super().update(instance,validated_data)
        if password:instance.set_password(password);instance.save(update_fields=['password'])
        return instance


    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'full_name', 'role', 'role_display', 'memberships', 'platform_admin',
                  'phone', 'department', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Create a new user with hashed password"""
        password = validated_data.pop('password',None)
        if not password:raise serializers.ValidationError({'password':'请输入至少10位密码'})
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirm', 'email', 'full_name', 'role', 'phone', 'department']

    def validate(self, attrs):
        """Validate passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords don't match"})
        return attrs

    def create(self, validated_data):
        """Create a new user"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info"""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['role'] = user.role
        token['full_name'] = user.full_name or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra user info to response
        data['user'] = UserSerializer(self.user).data
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'actor_username', 'action', 'action_display',
                  'entity_type', 'entity_id', 'entity_repr', 'diff', 'ip_address',
                  'user_agent', 'created_at']
        read_only_fields = ['id', 'created_at']
