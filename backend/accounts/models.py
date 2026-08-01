from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """Custom user with unique email (best practice: extend AbstractUser)."""

    email = models.EmailField("email address", unique=True, blank=False)

    REQUIRED_FIELDS = ["email"]
