"""
Tests for Assets functionality
"""
import pytest
from rest_framework import status
from assets.models import Asset


@pytest.mark.django_db
class TestAssetAPI:
    """Test asset API endpoints"""

    def test_create_asset(self, authenticated_client, admin_user):
        """Test creating a new asset"""
        url = '/api/assets/'
        data = {
            'code': 'AST-002',
            'name': 'Test Machine 2',
            'process': 'Assembly',
            'factory': 'Factory A',
            'workshop': 'Workshop 1',
            'criticality': 'normal'
        }
        response = authenticated_client.post(url, data, format='json')
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Error data: {response.data}")
        assert response.status_code == status.HTTP_201_CREATED
        assert Asset.objects.filter(code='AST-002').exists()

    def test_list_assets(self, authenticated_client, asset):
        """Test listing assets"""
        url = '/api/assets/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1

    def test_get_asset_detail(self, authenticated_client, asset):
        """Test getting asset detail"""
        url = f'/api/assets/{asset.id}/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['code'] == asset.code

    def test_update_asset(self, authenticated_client, asset):
        """Test updating an asset"""
        url = f'/api/assets/{asset.id}/'
        data = {'name': 'Updated Equipment Name'}
        response = authenticated_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        asset.refresh_from_db()
        assert asset.name == 'Updated Equipment Name'

    def test_delete_asset(self, authenticated_client, asset):
        """Test deleting an asset"""
        url = f'/api/assets/{asset.id}/'
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Asset.objects.filter(id=asset.id).exists()

    def test_filter_assets_by_status(self, authenticated_client, asset):
        """Test filtering assets by status"""
        url = '/api/assets/?status=active'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert all(a['status'] == 'active' for a in response.data['results'])

    def test_filter_assets_by_location(self, authenticated_client, asset):
        """Test filtering assets by location"""
        url = '/api/assets/?factory=Factory A&workshop=Workshop+1'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert all(a['factory'] == 'Factory A' for a in response.data['results'])

    def test_search_assets(self, authenticated_client, asset):
        """Test searching assets"""
        url = '/api/assets/?search=AST-001'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1

    def test_get_asset_tree(self, authenticated_client, asset, admin_user):
        """Test getting asset hierarchy tree"""
        # Create parent-child relationship
        child_asset = Asset.objects.create(
            code='AST-003',
            name='Child Equipment',
            factory='Factory A',
            parent=asset,
            using_organization=asset.using_organization,
            created_by=admin_user
        )

        url = '/api/assets/tree/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_get_asset_children(self, authenticated_client, asset, admin_user):
        """Test getting child assets"""
        # Create child asset
        child_asset = Asset.objects.create(
            code='AST-004',
            name='Child Equipment 2',
            factory='Factory A',
            parent=asset,
            using_organization=asset.using_organization,
            created_by=admin_user
        )

        url = f'/api/assets/{asset.id}/children/'
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


@pytest.mark.django_db
class TestAssetValidation:
    """Test asset validation rules"""

    def test_code_must_be_unique(self, authenticated_client, asset):
        """Test that asset code must be unique"""
        url = '/api/assets/'
        data = {
            'code': asset.code,  # Duplicate code
            'name': 'Another Equipment',
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_asset_cannot_be_own_parent(self, authenticated_client, asset):
        """Test that an asset cannot be its own parent"""
        url = f'/api/assets/{asset.id}/'
        data = {'parent': asset.id}
        response = authenticated_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
