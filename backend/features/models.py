from django.conf import settings
from django.db import models


class Feature(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        PLANNED = "planned", "Planned"
        DONE = "done", "Done"

    title = models.CharField(max_length=200)
    description = models.TextField()
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_features",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    vote_count = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["-vote_count", "-created_at"]

    def __str__(self) -> str:
        return self.title


class Vote(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feature_votes",
    )
    feature = models.ForeignKey(
        Feature,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "feature"],
                name="features_vote_user_feature_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.feature_id}"
