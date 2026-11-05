from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import summarize
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request):return Response(summarize(request))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workorders(request):
    result=summarize(request);return Response({**result["workorders"],"filters":result["filters"],"scope":result["scope"]})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inspections(request):
    result=summarize(request);return Response({**result["inspections"],"filters":result["filters"],"scope":result["scope"]})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def examinations(request):
    result=summarize(request);return Response({**result["examinations"],"filters":result["filters"],"scope":result["scope"]})
