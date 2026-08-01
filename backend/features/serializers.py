from django.utils.text import Truncator
from rest_framework import serializers

from .models import Feature, Vote

LIST_DESCRIPTION_LENGTH = 280


def display_name_for_user(user) -> str:
    if user is None:
        return ""
    full = user.get_full_name().strip()
    if full:
        return full
    if getattr(user, "username", None):
        return user.username
    return user.email or str(user.pk)


def resolve_has_voted_for_list(obj, request) -> bool:
    """
    Use the queryset `user_has_voted` annotation when present.

    That annotation is computed in FeatureViewSet.get_queryset() for list
    requests; it is only valid for instances returned from that queryset (not
    for arbitrary long-lived model instances).
    """
    if hasattr(obj, "user_has_voted"):
        return bool(obj.user_has_voted)
    user = getattr(request, "user", None) if request else None
    if not user or not user.is_authenticated:
        return False
    return Vote.objects.filter(feature=obj, user=user).exists()


def resolve_has_voted_from_db(obj, request) -> bool:
    """Always read from Vote rows (detail / create / vote responses)."""
    user = getattr(request, "user", None) if request else None
    if not user or not user.is_authenticated:
        return False
    return Vote.objects.filter(feature_id=obj.pk, user_id=user.pk).exists()


class FeatureListSerializer(serializers.ModelSerializer):
    """List payload: truncated description; `has_voted` uses list queryset annotation."""

    description = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Feature
        fields = [
            "id",
            "title",
            "description",
            "created_at",
            "status",
            "vote_count",
            "has_voted",
            "submitted_by_name",
        ]

    def get_description(self, obj) -> str:
        return Truncator(obj.description).chars(LIST_DESCRIPTION_LENGTH)

    def get_has_voted(self, obj) -> bool:
        return resolve_has_voted_for_list(obj, self.context.get("request"))

    def get_submitted_by_name(self, obj) -> str | None:
        if obj.submitted_by_id is None:
            return None
        return display_name_for_user(obj.submitted_by)


class FeatureDetailSerializer(serializers.ModelSerializer):
    """Full `description`; `has_voted` always from DB (no stale annotations)."""

    has_voted = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Feature
        fields = [
            "id",
            "title",
            "description",
            "created_at",
            "status",
            "vote_count",
            "has_voted",
            "submitted_by_name",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "vote_count",
            "has_voted",
            "submitted_by_name",
        ]

    def get_has_voted(self, obj) -> bool:
        return resolve_has_voted_from_db(obj, self.context.get("request"))

    def get_submitted_by_name(self, obj) -> str | None:
        if obj.submitted_by_id is None:
            return None
        return display_name_for_user(obj.submitted_by)
