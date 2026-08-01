from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")
        read_only_fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ("username", "email", "password")
        extra_kwargs = {
            "email": {"required": True},
            "username": {"required": True},
        }

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError("That username is already taken.")
        return cleaned

    def validate_email(self, value: str) -> str:
        cleaned = value.strip()
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return cleaned

    def validate(self, attrs):
        user = User(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"password": list(exc.messages)},
            ) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
