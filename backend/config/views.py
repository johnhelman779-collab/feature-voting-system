from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET


@ensure_csrf_cookie
@require_GET
def csrf_cookie_view(request):
    return JsonResponse({"detail": "ok"})
