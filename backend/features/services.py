"""
Vote side-effects: keep `Feature.vote_count` in sync with `Vote` rows.

All code paths that add or remove votes should go through this module so the
denormalized counter does not drift.
"""

from django.db import transaction
from django.db.models import F

from .models import Feature, Vote


def record_vote(user, feature: Feature) -> None:
    """
    Insert a Vote for (user, feature) and increment feature.vote_count under a
    row lock. Raises IntegrityError if that vote already exists (DB constraint).
    """
    with transaction.atomic():
        Feature.objects.select_for_update(of=("self",)).get(pk=feature.pk)
        Vote.objects.create(user=user, feature=feature)
        Feature.objects.filter(pk=feature.pk).update(vote_count=F("vote_count") + 1)
