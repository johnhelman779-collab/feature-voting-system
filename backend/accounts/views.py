from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MeSerializer, RegisterSerializer


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """JWT pair endpoint with scoped rate limiting."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token_obtain"


class ThrottledTokenRefreshView(TokenRefreshView):
    """JWT refresh endpoint with scoped rate limiting."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token_refresh"


class RegisterView(generics.CreateAPIView):
    """Sign up with email, username, and password; returns JWT pair + user."""

    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": MeSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user
