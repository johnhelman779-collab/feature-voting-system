"""
Optional dev-only auth: send header ``X-Dev-Mock-Auth: 1`` when ``DEBUG`` is True
to authenticate as a fixed user (for voting without logging in).

Session authentication is listed first in settings so a real login still wins.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication

MOCK_USERNAME = "__dev_voter__"
MOCK_EMAIL = "__dev_voter__@example.invalid"


class DevelopmentMockUserAuthentication(BaseAuthentication):
    """Authenticate as a shared dev user when a header is present (DEBUG only)."""

    def authenticate(self, request):
        if not settings.DEBUG:
            return None
        if request.META.get("HTTP_X_DEV_MOCK_AUTH") != "1":
            return None

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=MOCK_USERNAME,
            defaults={"email": MOCK_EMAIL},
        )
        if created or not user.has_usable_password():
            user.set_unusable_password()
            user.save(update_fields=["password"])
        if not user.email:
            user.email = MOCK_EMAIL
            user.save(update_fields=["email"])

        return user, None
