import re
from rest_framework import serializers
from django.utils import timezone

from catalogues.models import Category
from .models import Enquiry, EnquiryAction


class EnquirySubmitSerializer(serializers.ModelSerializer):
    """Serializer for public enquiry submission."""
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
    )

    class Meta:
        model = Enquiry
        fields = ['id', 'name', 'email', 'phone', 'category', 'description']
        read_only_fields = ['id']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        if not re.match(r'^[a-zA-Z\s.\'-]+$', value):
            raise serializers.ValidationError('Name can only contain letters, spaces, dots, hyphens, and apostrophes.')
        return value

    def validate_phone(self, value):
        cleaned = re.sub(r'[\s\-\(\)]', '', value)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise serializers.ValidationError('Enter a valid phone number (10-15 digits, optional + prefix).')
        return cleaned

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError('Description must be at least 10 characters.')
        return value

    def validate_category(self, value):
        if not value.has_catalogue:
            raise serializers.ValidationError('This category does not have a catalogue available yet.')
        return value


class OTPVerifySerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate_otp_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('OTP must be exactly 6 digits.')
        return value


class EnquiryListSerializer(serializers.ModelSerializer):
    """Serializer for admin enquiry list view."""
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Enquiry
        fields = [
            'id', 'name', 'email', 'phone', 'category', 'category_name',
            'status', 'otp_verified', 'download_count', 'created_at',
        ]


class EnquiryDetailSerializer(serializers.ModelSerializer):
    """Serializer for admin enquiry detail view."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Enquiry
        fields = [
            'id', 'name', 'email', 'phone', 'category', 'category_name',
            'description', 'otp_verified', 'otp_verified_at',
            'download_link_sent', 'download_count', 'status',
            'admin_notes', 'created_at', 'updated_at', 'actions',
        ]
        read_only_fields = [
            'id', 'name', 'email', 'phone', 'category', 'description',
            'otp_verified', 'otp_verified_at', 'download_link_sent',
            'download_count', 'created_at', 'updated_at',
        ]

    def get_actions(self, obj):
        return EnquiryActionSerializer(
            obj.actions.select_related('action_by').all(),
            many=True,
        ).data


class EnquiryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin updating enquiry status/notes."""

    class Meta:
        model = Enquiry
        fields = ['status', 'admin_notes']


class EnquiryActionSerializer(serializers.ModelSerializer):
    action_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EnquiryAction
        fields = ['id', 'old_status', 'new_status', 'notes', 'action_by', 'action_by_name', 'created_at']
        read_only_fields = ['id', 'action_by', 'action_by_name', 'created_at']

    def get_action_by_name(self, obj):
        if obj.action_by:
            return obj.action_by.get_full_name() or obj.action_by.username
        return 'System'


class EnquiryActionCreateSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=Enquiry.Status.choices, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, data):
        if not data.get('new_status') and not data.get('notes'):
            raise serializers.ValidationError('Either new_status or notes is required.')
        return data
