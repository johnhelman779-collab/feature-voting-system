from django.urls import path

from .views import (
    MeView,
    RegisterView,
    ThrottledTokenObtainPairView,
    ThrottledTokenRefreshView,
)

urlpatterns = [
    path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "token/refresh/",
        ThrottledTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("register/", RegisterView.as_view(), name="accounts_register"),
    path("me/", MeView.as_view(), name="accounts_me"),
]
