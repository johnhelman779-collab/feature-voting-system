from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    ordering = ("username",)
    list_display = ("username", "email", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
