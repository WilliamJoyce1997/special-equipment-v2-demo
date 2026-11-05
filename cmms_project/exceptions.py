from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_handler
class Conflict(APIException):
    status_code=409
    default_detail="状态已变化，请刷新后重试"
    default_code="conflict"

def exception_handler(exc,context):
    response=drf_handler(exc,context)
    if response is not None:
        original=response.data
        response.data={"code":getattr(exc,"default_code","validation_error"),"message":str(original.get("detail","输入不完整或无操作权限")) if isinstance(original,dict) else "请求失败","fields":original}
    return response
