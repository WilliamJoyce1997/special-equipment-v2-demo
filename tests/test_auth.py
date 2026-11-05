"""
Tests for User Authentication
"""
import pytest
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestAuthentication:
    """Test authentication endpoints"""

    def test_user_registration(self, api_client):
        """Test user registration"""
        url = '/api/auth/users/register/'
        data = {
            'username': 'testuser',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'email': 'test@example.com',
            'full_name': 'Test User',
            'role': 'technician'
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert not User.objects.filter(username='testuser').exists()

    def test_user_registration_password_mismatch(self, api_client):
        """Test registration with password mismatch"""
        url = '/api/auth/users/register/'
        data = {
            'username': 'testuser2',
            'password': 'testpass123',
            'password_confirm': 'differentpass',
            'email': 'test2@example.com',
            'full_name': 'Test User 2'
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_login(self, api_client, admin_user):
        """Test user login and token generation"""
        url = '/api/auth/login/'
        data = {
            'username': 'admin',
            'password': 'admin123'
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        assert response.data['user']['username'] == 'admin'

    def test_get_current_user(self, authenticated_client, admin_user):
        """Test getting current user info"""
        url = '/api/auth/users/me/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == admin_user.username
        assert response.data['role'] == admin_user.role

    def test_token_refresh(self, api_client, admin_user):
        """Test token refresh"""
        # First login to get tokens
        url = '/api/auth/login/'
        data = {'username': 'admin', 'password': 'admin123'}
        response = api_client.post(url, data, format='json')
        refresh_token = response.data['refresh']

        # Now refresh
        url = '/api/auth/refresh/'
        data = {'refresh': refresh_token}
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_unauthorized_access(self, api_client):
        """Test that unauthenticated requests are denied"""
        url = '/api/assets/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserManagement:
    """Test user management endpoints"""

    def test_list_users(self, authenticated_client):
        """Test listing users"""
        url = '/api/auth/users/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_get_user_detail(self, authenticated_client, admin_user):
        """Test getting user detail"""
        url = f'/api/auth/users/{admin_user.id}/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == admin_user.username

    def test_update_user_requires_admin(self, authenticated_client, technician_user):
        """Test that only admins can update users"""
        authenticated_client.force_authenticate(user=technician_user)
        url = f'/api/auth/users/{technician_user.id}/'
        data = {'full_name': 'Updated Name'}
        response = authenticated_client.patch(url, data, format='json')
        # Should fail because technician is not admin
        assert response.status_code == status.HTTP_403_FORBIDDEN
