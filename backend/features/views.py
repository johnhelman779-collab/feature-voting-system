from django.db import IntegrityError
from django.db.models import BooleanField, Exists, OuterRef, Value
from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Feature, Vote
from .pagination import FeaturePagination
from .serializers import FeatureDetailSerializer, FeatureListSerializer
from .services import record_vote


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    pagination_class = FeaturePagination

    def get_queryset(self):
        qs = Feature.objects.select_related("submitted_by")
        user = self.request.user
        if user.is_authenticated:
            user_vote = Vote.objects.filter(
                feature_id=OuterRef("pk"),
                user_id=user.pk,
            )
            return qs.annotate(user_has_voted=Exists(user_vote))
        return qs.annotate(
            user_has_voted=Value(False, output_field=BooleanField()),
        )

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [AllowAny]
    filter_backends = [OrderingFilter]
    ordering_fields = ["vote_count", "created_at"]
    ordering = ["-vote_count", "-created_at"]

    def get_permissions(self):
        if self.action in ("create", "vote"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "list":
            return FeatureListSerializer
        return FeatureDetailSerializer

    def get_throttles(self):
        if self.action == "vote":
            self.throttle_scope = "vote"
            return [ScopedRateThrottle()]
        self.throttle_scope = None
        return super().get_throttles()

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        feature = self.get_object()
        try:
            record_vote(request.user, feature)
        except IntegrityError:
            return Response(
                {"detail": "You have already voted for this feature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feature = self.get_queryset().get(pk=feature.pk)
        serializer = FeatureDetailSerializer(feature, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
