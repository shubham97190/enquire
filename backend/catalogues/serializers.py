import os
from rest_framework import serializers
from django.utils import timezone
from django.utils.text import slugify

from .models import Category


class CategoryListSerializer(serializers.ModelSerializer):
    has_catalogue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'has_catalogue', 'is_active']


class CategoryDetailSerializer(serializers.ModelSerializer):
    has_catalogue = serializers.BooleanField(read_only=True)
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'has_catalogue', 'catalogue_file',
            'file_name', 'file_size', 'file_uploaded_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_file_name(self, obj):
        if obj.catalogue_file:
            return os.path.basename(obj.catalogue_file.name)
        return None

    def get_file_size(self, obj):
        if obj.catalogue_file:
            try:
                return obj.catalogue_file.size
            except (FileNotFoundError, OSError):
                return None
        return None


class CategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """Create a category (name only) or update name/is_active."""

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active']
        read_only_fields = ['id']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        qs = Category.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return value

    def create(self, validated_data):
        name = validated_data['name']
        validated_data.setdefault('slug', slugify(name))
        return super().create(validated_data)


class CategoryUploadSerializer(serializers.ModelSerializer):
    catalogue_file = serializers.FileField()

    class Meta:
        model = Category
        fields = ['catalogue_file']

    def validate_catalogue_file(self, value):
        allowed_types = ['application/pdf']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError('Only PDF files are allowed.')
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size must not exceed 50MB.')
        ext = os.path.splitext(value.name)[1].lower()
        if ext != '.pdf':
            raise serializers.ValidationError('Only .pdf files are allowed.')
        return value

    def update(self, instance, validated_data):
        if instance.catalogue_file:
            try:
                instance.catalogue_file.delete(save=False)
            except Exception:
                pass
        instance.catalogue_file = validated_data['catalogue_file']
        instance.file_uploaded_at = timezone.now()
        instance.save()
        return instance


class CategoryDetailSerializer(serializers.ModelSerializer):
    has_catalogue = serializers.BooleanField(read_only=True)
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'has_catalogue', 'catalogue_file',
            'file_name', 'file_size', 'file_uploaded_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_file_name(self, obj):
        if obj.catalogue_file:
            return os.path.basename(obj.catalogue_file.name)
        return None

    def get_file_size(self, obj):
        if obj.catalogue_file:
            try:
                return obj.catalogue_file.size
            except (FileNotFoundError, OSError):
                return None
        return None


class CategoryUploadSerializer(serializers.ModelSerializer):
    catalogue_file = serializers.FileField()

    class Meta:
        model = Category
        fields = ['catalogue_file']

    def validate_catalogue_file(self, value):
        # Validate file type
        allowed_types = ['application/pdf']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError('Only PDF files are allowed.')

        # Validate file size (50MB max)
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size must not exceed 50MB.')

        # Validate file extension
        ext = os.path.splitext(value.name)[1].lower()
        if ext != '.pdf':
            raise serializers.ValidationError('Only .pdf files are allowed.')

        return value

    def update(self, instance, validated_data):
        # Delete old file if it exists
        if instance.catalogue_file:
            try:
                instance.catalogue_file.delete(save=False)
            except Exception:
                pass

        instance.catalogue_file = validated_data['catalogue_file']
        instance.file_uploaded_at = timezone.now()
        instance.save()
        return instance
