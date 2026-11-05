import pytest
from django.test import Client,override_settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

pytestmark=pytest.mark.django_db
@override_settings(ROOT_URLCONF="cmms_project.preview_urls",DEBUG=False,ALLOWED_HOSTS=["testserver"],REST_FRAMEWORK={**__import__("django.conf",fromlist=["settings"]).settings.REST_FRAMEWORK,"DEFAULT_AUTHENTICATION_CLASSES":("cmms_project.preview_auth.PreviewJWTAuthentication",),"DEFAULT_THROTTLE_RATES":{"anon":"30/min"}})
def test_public_preview_blocks_admin_and_anonymous():
    user=get_user_model().objects.create_user(username="preview_admin",password="ExampleOnly_StrongPassword1!",role="admin",is_staff=True)
    c=Client(raise_request_exception=False)
    assert c.get("/admin/").status_code==404
    assert c.post("/api/auth/login/",{"username":"preview_admin","password":"ExampleOnly_StrongPassword1!"},content_type="application/json").status_code==401
    assert c.get("/api/assets/").status_code==401
    assert c.get("/api/auth/users/").status_code==401
    c.defaults["HTTP_AUTHORIZATION"]="Bearer "+str(AccessToken.for_user(user))
    assert c.get("/api/assets/").status_code==401
